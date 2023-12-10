import { Storage } from "@plasmohq/storage";
import type { PlasmoCSConfig } from "plasmo";
import {
  getIsSubscribed,
  getRateButtons,
  getRatedButton,
  rateVideo
} from "~cs-helpers/content-script-youtube-rate-buttons";
import {
  addNavigationListener,
  getElementByMutationObserver,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  REGEX_SUPPORTED_PAGES,
  SELECTORS
} from "~utils-initials";

let gLastUrl = location.href;
let gLastTitle = document.title;

const OBSERVER_SUBSCRIPTION = new MutationObserver(() => {
  if (getIsSubscribed()) {
    autoLikeIfSubscribed();
    OBSERVER_SUBSCRIPTION.disconnect();
  }
});

function autoLikeIfSubscribed(_?: MutationRecord[], observer?: MutationObserver) {
  const [elLike] = getRateButtons();
  const isSubscribed = getIsSubscribed();
  if (isSubscribed && elLike && !getRatedButton()) {
    rateVideo(true);
    observer?.disconnect();
    return true;
  }

  observer?.disconnect();
  return false;
}

async function addTemporaryBodyListener() {
  if (gLastUrl === location.href || gLastTitle === document.title) {
    return;
  }

  gLastUrl = location.href;
  gLastTitle = document.title;

  if (!window.ytrAutoLikeSubscribedChannels || !getIsPageCompatible()) {
    return;
  }
  await getElementByMutationObserver(SELECTORS.toggleButtonsNormalVideo);
  if (autoLikeIfSubscribed()) {
    OBSERVER_SUBSCRIPTION.observe(document, OBSERVER_OPTIONS);
  }
}

function getIsPageCompatible() {
  return Boolean(location.pathname.match(REGEX_SUPPORTED_PAGES));
}

function addStorageListener() {
  const storageSync = new Storage({ area: "sync" });
  storageSync.watch({
    isAutoLikeSubscribedChannels({ newValue: isAutoLike }: { newValue: boolean }) {
      window.ytrAutoLikeSubscribedChannels = isAutoLike;
      if (isAutoLike && getIsPageCompatible()) {
        autoLikeIfSubscribed();
      }
    }
  });
}

async function addSubscribedEventListener() {
  const elSubscribed = await getElementByMutationObserver<HTMLButtonElement>(SELECTORS.buttonSubscribe);
  OBSERVER_SUBSCRIPTION.observe(elSubscribed, { attributes: true, attributeFilter: ["subscribed"] });
}

async function init() {
  window.ytrAutoLikeSubscribedChannels = await getStorage({
    area: "sync",
    key: "isAutoLikeSubscribedChannels",
    fallback: initial.isAutoLikeSubscribedChannels,
    updateWindowKey: "ytrAutoLikeSubscribedChannels"
  });

  addStorageListener();
  addNavigationListener(addTemporaryBodyListener);

  if (!getIsPageCompatible()) {
    return;
  }

  addSubscribedEventListener();

  if (!window.ytrAutoLikeSubscribedChannels) {
    return;
  }

  new MutationObserver(autoLikeIfSubscribed).observe(document, OBSERVER_OPTIONS);
}

init();

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"]
};
