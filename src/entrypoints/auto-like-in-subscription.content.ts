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

function getIsFollowing() {
  return location.hostname === YOUTUBE_HOST.music ? getIsInLibrary() : getIsSubscribed();
}

let OBSERVER_SUBSCRIPTION: MutationObserver;
let lastUrl: string | undefined;
let lastTitle: string | undefined;
let hasHandledNavigation = false;
let hasNavigated = false;

async function autoLikeIfSubscribed(_?: MutationRecord[], observer?: MutationObserver) {
  if (hasHandledNavigation) {
    observer?.disconnect();
    return true;
  }

  if (!hasNavigated) {
    return false;
  }

  const isAutoLikeSubscribedChannels = window.ytrAutoLikeSubscribedChannels;
  if (!isAutoLikeSubscribedChannels) {
    observer?.disconnect();
    return true;
  }

  const [elLike] = getRateButtons();
  if (!elLike) {
    return false;
  }

  const isAlreadyRated = getRatedButton();
  if (isAlreadyRated) {
    hasHandledNavigation = true;
    observer?.disconnect();
    return true;
  }

  const isFollowing = getIsFollowing();
  if (!isFollowing) {
    return false;
  }

  hasHandledNavigation = true;
  await rateVideo(true);
  observer?.disconnect();
  return true;
}

async function addTemporaryBodyListener() {
  const isSameUrlOrTitle = lastUrl === location.href || lastTitle === document.title;
  if (isSameUrlOrTitle) {
    return;
  }

  lastUrl = location.href;
  lastTitle = document.title;
  hasHandledNavigation = false;
  hasNavigated = true;

  const isAutoLikeSubscribedChannels = window.ytrAutoLikeSubscribedChannels;
  if (!isAutoLikeSubscribedChannels) {
    return;
  }

  const isLikedNow = await autoLikeIfSubscribed();
  if (isLikedNow) {
    OBSERVER_SUBSCRIPTION.observe(document, OBSERVER_OPTIONS);
    return;
  }

  const navigationUrl = location.href;
  new MutationObserver(async (_, observer) => {
    const isUrlChanged = location.href !== navigationUrl;
    if (isUrlChanged) {
      observer.disconnect();
      return;
    }
    const isLikedAfterMutation = await autoLikeIfSubscribed();
    if (isLikedAfterMutation) {
      OBSERVER_SUBSCRIPTION.observe(document, OBSERVER_OPTIONS);
      observer.disconnect();
    }
  }).observe(document, OBSERVER_OPTIONS);
}

function addStorageListener() {
  storage.watch<boolean>(StorageKey.isAutoLikeSubscribedChannels, async isAutoLike => {
    const isAutoLikeSet = isAutoLike !== null;
    window.ytrAutoLikeSubscribedChannels = isAutoLikeSet ? isAutoLike : initial.isAutoLikeSubscribedChannels;
    if (isAutoLike) {
      await autoLikeIfSubscribed();
    }
  });
}

async function addFollowEventListener() {
  const selector = location.hostname === YOUTUBE_HOST.music ? SELECTORS.buttonFollowMusic : SELECTORS.buttonSubscribe;
  const elFollowButton = await getElementByMutationObserver<HTMLButtonElement>(selector);
  OBSERVER_SUBSCRIPTION.observe(elFollowButton, {
    attributes: true,
    attributeFilter: [DOM_ATTRIBUTE.subscribed]
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://music.youtube.com/*"],
  async main () {
    lastUrl = location.href;
    lastTitle = document.title;

    OBSERVER_SUBSCRIPTION = new MutationObserver(async () => {
      const isFollowing = getIsFollowing();
      if (isFollowing) {
        await autoLikeIfSubscribed();
        OBSERVER_SUBSCRIPTION.disconnect();
      }
    });

    window.ytrAutoLikeSubscribedChannels = await getStorage({
      storageKey: StorageKey.isAutoLikeSubscribedChannels,
      fallback: initial.isAutoLikeSubscribedChannels,
      updateWindowKey: "ytrAutoLikeSubscribedChannels"
    });

    addStorageListener();
    await addNavigationListener(addTemporaryBodyListener);
    await addFollowEventListener();

    const isAutoLikeSubscribedChannels = window.ytrAutoLikeSubscribedChannels;
    if (!isAutoLikeSubscribedChannels) {
      return;
    }

    new MutationObserver(autoLikeIfSubscribed).observe(document, OBSERVER_OPTIONS);
  }
});
