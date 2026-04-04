import {
  addNavigationListener,
  getElementByMutationObserver,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS
} from "@/lib/utils-initials";
import { getIsSubscribed, getRateButtons, getRatedButton, rateVideo } from "@/lib/ytr-buttons";

let OBSERVER_SUBSCRIPTION: MutationObserver;
let lastUrl: string | undefined;
let lastTitle: string | undefined;

async function autoLikeIfSubscribed(_?: MutationRecord[], observer?: MutationObserver) {
  const [elLike] = getRateButtons();
  const isSubscribed = getIsSubscribed();
  if (isSubscribed && elLike && !getRatedButton()) {
    await rateVideo(true);
    observer?.disconnect();
    return true;
  }

  observer?.disconnect();
  return false;
}

async function addTemporaryBodyListener() {
  if (lastUrl === location.href || lastTitle === document.title) {
    return;
  }

  lastUrl = location.href;
  lastTitle = document.title;

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
  storage.watch<boolean>("sync:isAutoLikeSubscribedChannels", async isAutoLike => {
    window.ytrAutoLikeSubscribedChannels = isAutoLike !== null ? isAutoLike : initial.isAutoLikeSubscribedChannels;
    if (isAutoLike) {
      await autoLikeIfSubscribed();
    }
  });
}

async function addSubscribedEventListener() {
  const elSubscribed = await getElementByMutationObserver<HTMLButtonElement>(SELECTORS.buttonSubscribe);
  OBSERVER_SUBSCRIPTION.observe(elSubscribed, { attributes: true, attributeFilter: ["subscribed"] });
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
      area: "sync",
      key: "isAutoLikeSubscribedChannels",
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
