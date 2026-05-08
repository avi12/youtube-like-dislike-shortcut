import {
  addNavigationListener,
  DOM_ATTRIBUTE,
  getElementByMutationObserver,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey
} from "@/lib/utils-initials";
import { getIsSubscribed, getRateButtons, getRatedButton, rateVideo } from "@/lib/ytr-buttons";

let OBSERVER_SUBSCRIPTION: MutationObserver;
let lastUrl: string | undefined;
let lastTitle: string | undefined;
let hasHandledNavigation = false;

async function autoLikeIfSubscribed(_?: MutationRecord[], observer?: MutationObserver) {
  if (hasHandledNavigation) {
    observer?.disconnect();
    return true;
  }

  const [elLike] = getRateButtons();
  if (!elLike) {
    return false;
  }

  if (getRatedButton()) {
    hasHandledNavigation = true;
    observer?.disconnect();
    return true;
  }

  if (!getIsSubscribed()) {
    return false;
  }

  hasHandledNavigation = true;
  await rateVideo(true);
  observer?.disconnect();
  return true;
}

async function addTemporaryBodyListener() {
  if (lastUrl === location.href || lastTitle === document.title) {
    return;
  }

  lastUrl = location.href;
  lastTitle = document.title;
  hasHandledNavigation = false;

  if (!window.ytrAutoLikeSubscribedChannels) {
    return;
  }

  if (await autoLikeIfSubscribed()) {
    OBSERVER_SUBSCRIPTION.observe(document, OBSERVER_OPTIONS);
    return;
  }

  const navigationUrl = location.href;
  new MutationObserver(async (_, observer) => {
    if (location.href !== navigationUrl) {
      observer.disconnect();
      return;
    }
    if (await autoLikeIfSubscribed()) {
      OBSERVER_SUBSCRIPTION.observe(document, OBSERVER_OPTIONS);
      observer.disconnect();
    }
  }).observe(document, OBSERVER_OPTIONS);
}

function addStorageListener() {
  storage.watch<boolean>(StorageKey.isAutoLikeSubscribedChannels, async isAutoLike => {
    window.ytrAutoLikeSubscribedChannels = isAutoLike !== null ? isAutoLike : initial.isAutoLikeSubscribedChannels;
    if (isAutoLike) {
      await autoLikeIfSubscribed();
    }
  });
}

async function addSubscribedEventListener() {
  const elSubscribed = await getElementByMutationObserver<HTMLButtonElement>(SELECTORS.buttonSubscribe);
  OBSERVER_SUBSCRIPTION.observe(elSubscribed, {
    attributes: true,
    attributeFilter: [DOM_ATTRIBUTE.subscribed]
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  async main () {
    lastUrl = location.href;
    lastTitle = document.title;

    OBSERVER_SUBSCRIPTION = new MutationObserver(async () => {
      if (getIsSubscribed()) {
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
    await addSubscribedEventListener();

    if (!window.ytrAutoLikeSubscribedChannels) {
      return;
    }

    new MutationObserver(autoLikeIfSubscribed).observe(document, OBSERVER_OPTIONS);
  }
});
