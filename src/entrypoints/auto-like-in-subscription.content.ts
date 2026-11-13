import { storage } from "#imports";
import { getEnabledSurfaces, watchEnabledSurfaces } from "@/lib/surfaces";
import {
  addNavigationListener,
  DomAttribute,
  getCurrentSurface,
  getElementByMutationObserver,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey,
  YoutubeHost
} from "@/lib/utils-initials";
import { getIsInLibrary, getIsSubscribed, getRateButtons, getRatedButton, rateVideo } from "@/lib/ytr-buttons";
import {
  announceSubscriptionDecision,
  resetSubscriptionDecision,
  SubscriptionDecision
} from "@/lib/ytr-subscription-signal";

function getIsFollowing() {
  const { hostname } = location;
  return hostname === YoutubeHost.MUSIC ? getIsInLibrary() : getIsSubscribed();
}

function getFollowSelector() {
  const { hostname } = location;
  const { BUTTON_FOLLOW_MUSIC, BUTTON_SUBSCRIBE } = SELECTORS;
  return hostname === YoutubeHost.MUSIC ? BUTTON_FOLLOW_MUSIC : BUTTON_SUBSCRIBE;
}

let lastUrl: string | undefined;
let lastTitle: string | undefined;
let isNavigationHandled = false;
let isUserSubscribeClickPending = false;
let isAutoLikeSubscribedChannels = initial.isAutoLikeSubscribedChannels;
let enabledSurfaces = initial.enabledSurfaces;

function getIsAutoLikeActive() {
  return isAutoLikeSubscribedChannels && enabledSurfaces[getCurrentSurface()];
}

async function autoLikeIfSubscribed(_?: MutationRecord[], observer?: MutationObserver) {
  if (isNavigationHandled) {
    observer?.disconnect();
    return true;
  }

  if (!getIsAutoLikeActive()) {
    announceSubscriptionDecision(SubscriptionDecision.RELEASED);
    observer?.disconnect();
    return true;
  }

  const { elLike } = getRateButtons();
  if (!elLike) {
    return false;
  }

  const elAlreadyRated = getRatedButton();
  if (elAlreadyRated) {
    announceSubscriptionDecision(SubscriptionDecision.RELEASED);
    isNavigationHandled = true;
    observer?.disconnect();
    return true;
  }

  const isFollowing = getIsFollowing();
  if (!isFollowing) {
    announceSubscriptionDecision(SubscriptionDecision.RELEASED);
    return false;
  }

  announceSubscriptionDecision(SubscriptionDecision.CLAIMED);
  isNavigationHandled = true;
  await rateVideo(true);
  observer?.disconnect();
  return true;
}

async function handleUserSubscribed() {
  if (!isUserSubscribeClickPending) {
    return;
  }

  const isFollowing = getIsFollowing();
  if (!isFollowing) {
    isUserSubscribeClickPending = false;
    return;
  }

  isUserSubscribeClickPending = false;

  if (isNavigationHandled) {
    return;
  }

  const elAlreadyRated = getRatedButton();
  if (elAlreadyRated) {
    isNavigationHandled = true;
    return;
  }

  isNavigationHandled = true;
  await rateVideo(true);
}

function markUserSubscribeClick(e: Event) {
  const { target: elTarget } = e;
  if (!(elTarget instanceof Element)) {
    return;
  }

  const isInsideFollowButton = Boolean(elTarget.closest(getFollowSelector()));
  if (!isInsideFollowButton) {
    return;
  }

  isUserSubscribeClickPending = true;
}

async function addTemporaryBodyListener() {
  const { href } = location;
  const { title } = document;
  const isSameUrlOrTitle = lastUrl === href || lastTitle === title;
  if (isSameUrlOrTitle) {
    return;
  }

  lastUrl = href;
  lastTitle = title;
  isNavigationHandled = false;
  isUserSubscribeClickPending = false;
  resetSubscriptionDecision();

  if (!getIsAutoLikeActive()) {
    announceSubscriptionDecision(SubscriptionDecision.RELEASED);
    return;
  }

  const isLikedNow = await autoLikeIfSubscribed();
  if (isLikedNow) {
    return;
  }

  const navigationUrl = href;
  new MutationObserver(async (_, observer) => {
    const isUrlChanged = location.href !== navigationUrl;
    if (isUrlChanged) {
      observer.disconnect();
      return;
    }

    const isLikedAfterMutation = await autoLikeIfSubscribed();
    if (isLikedAfterMutation) {
      observer.disconnect();
    }
  }).observe(document, OBSERVER_OPTIONS);
}

function addStorageListener() {
  storage.watch<boolean>(StorageKey.IS_AUTO_LIKE_SUBSCRIBED_CHANNELS, async isAutoLike => {
    const isAutoLikeSet = isAutoLike !== null;
    isAutoLikeSubscribedChannels = isAutoLikeSet ? isAutoLike : initial.isAutoLikeSubscribedChannels;

    if (!isAutoLikeSubscribedChannels) {
      announceSubscriptionDecision(SubscriptionDecision.RELEASED);
      return;
    }

    await autoLikeIfSubscribed();
  });
}

async function addFollowButtonObserver() {
  const elFollowButton = await getElementByMutationObserver<HTMLButtonElement>(getFollowSelector());
  new MutationObserver(handleUserSubscribed).observe(elFollowButton, {
    attributes: true,
    attributeFilter: [DomAttribute.SUBSCRIBED]
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://music.youtube.com/*"],
  async main() {
    lastUrl = location.href;
    lastTitle = document.title;

    document.addEventListener("click", markUserSubscribeClick, { capture: true });
    document.addEventListener("keydown", markUserSubscribeClick, { capture: true });

    isAutoLikeSubscribedChannels = await storage.getItem<boolean>(StorageKey.IS_AUTO_LIKE_SUBSCRIBED_CHANNELS, {
      fallback: initial.isAutoLikeSubscribedChannels
    });

    if (!isAutoLikeSubscribedChannels) {
      announceSubscriptionDecision(SubscriptionDecision.RELEASED);
    }

    enabledSurfaces = await getEnabledSurfaces();
    watchEnabledSurfaces(updatedSurfaces => {
      enabledSurfaces = updatedSurfaces;
    });
    addStorageListener();
    await addNavigationListener(addTemporaryBodyListener);
    await addFollowButtonObserver();

    if (!isAutoLikeSubscribedChannels) {
      return;
    }

    new MutationObserver(autoLikeIfSubscribed).observe(document, OBSERVER_OPTIONS);
  }
});
