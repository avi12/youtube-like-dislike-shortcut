import {
  addNavigationListener,
  getElementByMutationObserver,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  REGEX_SUPPORTED_PAGES,
  SELECTORS
} from "@/lib/utils-initials";
import { getIsSubscribed, getRateButtons, getRatedButton, rateVideo } from "@/lib/ytr-buttons";

let OBSERVER_SUBSCRIPTION: MutationObserver;
let lastUrl: string | undefined;
let lastTitle: string | undefined;

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
  if (lastUrl === location.href || lastTitle === document.title) {
    return;
  }

  lastUrl = location.href;
  lastTitle = document.title;

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
  storage.watch<boolean>("sync:isAutoLikeSubscribedChannels", isAutoLike => {
    window.ytrAutoLikeSubscribedChannels = isAutoLike !== null ? isAutoLike : initial.isAutoLikeSubscribedChannels;
    if (isAutoLike && getIsPageCompatible()) {
      autoLikeIfSubscribed();
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

    OBSERVER_SUBSCRIPTION = new MutationObserver(() => {
      if (getIsSubscribed()) {
        autoLikeIfSubscribed();
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
});
