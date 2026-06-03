import {
  addNavigationListener,
  DOM_ATTRIBUTE,
  getElementByMutationObserver,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey,
  YOUTUBE_HOST
} from "@/lib/utils-initials";
import {
  getIsInLibrary,
  getIsSubscribed,
  getRateButtons,
  getRatedButton,
  rateVideo
} from "@/lib/ytr-buttons";
import {
  announceSubscriptionDecision,
  resetSubscriptionDecision,
  SubscriptionDecision
} from "@/lib/ytr-subscription-signal";

function getIsFollowing() {
  const { hostname } = location;
  return hostname === YOUTUBE_HOST.music ? getIsInLibrary() : getIsSubscribed();
}

function getFollowSelector() {
  const { hostname } = location;
  const { buttonFollowMusic, buttonSubscribe } = SELECTORS;
  return hostname === YOUTUBE_HOST.music ? buttonFollowMusic : buttonSubscribe;
}

let lastUrl: string | undefined;
let lastTitle: string | undefined;
let hasHandledNavigation = false;
let isUserSubscribeClickPending = false;

async function autoLikeIfSubscribed(_?: MutationRecord[], observer?: MutationObserver) {
  if (hasHandledNavigation) {
    observer?.disconnect();
    return true;
  }

  const isAutoLikeSubscribedChannels = window.ytrAutoLikeSubscribedChannels;
  if (!isAutoLikeSubscribedChannels) {
    announceSubscriptionDecision(SubscriptionDecision.released);
    observer?.disconnect();
    return true;
  }

  const [elLike] = getRateButtons();
  if (!elLike) {
    return false;
  }

  const elAlreadyRated = getRatedButton();
  if (elAlreadyRated) {
    announceSubscriptionDecision(SubscriptionDecision.released);
    hasHandledNavigation = true;
    observer?.disconnect();
    return true;
  }

  const isFollowing = getIsFollowing();
  if (!isFollowing) {
    announceSubscriptionDecision(SubscriptionDecision.released);
    return false;
  }

  announceSubscriptionDecision(SubscriptionDecision.claimed);
  hasHandledNavigation = true;
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
  if (hasHandledNavigation) {
    return;
  }
  const elAlreadyRated = getRatedButton();
  if (elAlreadyRated) {
    hasHandledNavigation = true;
    return;
  }
  hasHandledNavigation = true;
  await rateVideo(true);
}

function markUserSubscribeClick(e: Event) {
  const { target } = e;
  if (!(target instanceof Element)) {
    return;
  }
  const isInsideFollowButton = Boolean(target.closest(getFollowSelector()));
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
  hasHandledNavigation = false;
  isUserSubscribeClickPending = false;
  resetSubscriptionDecision();

  const isAutoLikeSubscribedChannels = window.ytrAutoLikeSubscribedChannels;
  if (!isAutoLikeSubscribedChannels) {
    announceSubscriptionDecision(SubscriptionDecision.released);
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
  storage.watch<boolean>(StorageKey.isAutoLikeSubscribedChannels, async isAutoLike => {
    const isAutoLikeSet = isAutoLike !== null;
    window.ytrAutoLikeSubscribedChannels = isAutoLikeSet ? isAutoLike : initial.isAutoLikeSubscribedChannels;
    if (!window.ytrAutoLikeSubscribedChannels) {
      announceSubscriptionDecision(SubscriptionDecision.released);
      return;
    }
    await autoLikeIfSubscribed();
  });
}

async function addFollowButtonObserver() {
  const elFollowButton = await getElementByMutationObserver<HTMLButtonElement>(getFollowSelector());
  new MutationObserver(handleUserSubscribed).observe(elFollowButton, {
    attributes: true,
    attributeFilter: [DOM_ATTRIBUTE.subscribed]
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://music.youtube.com/*"],
  async main() {
    lastUrl = location.href;
    lastTitle = document.title;

    document.addEventListener("click", markUserSubscribeClick, { capture: true });
    document.addEventListener("keydown", markUserSubscribeClick, { capture: true });

    window.ytrAutoLikeSubscribedChannels = await getStorage({
      storageKey: StorageKey.isAutoLikeSubscribedChannels,
      fallback: initial.isAutoLikeSubscribedChannels,
      updateWindowKey: "ytrAutoLikeSubscribedChannels"
    });

    if (!window.ytrAutoLikeSubscribedChannels) {
      announceSubscriptionDecision(SubscriptionDecision.released);
    }

    addStorageListener();
    await addNavigationListener(addTemporaryBodyListener);
    await addFollowButtonObserver();

    const isAutoLikeSubscribedChannels = window.ytrAutoLikeSubscribedChannels;
    if (!isAutoLikeSubscribedChannels) {
      return;
    }

    new MutationObserver(autoLikeIfSubscribed).observe(document, OBSERVER_OPTIONS);
  }
});
