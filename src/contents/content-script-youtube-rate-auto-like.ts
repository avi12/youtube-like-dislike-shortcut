import { Storage } from "@plasmohq/storage";
import styleText from "data-text:~styles/styles-youtube-rate.scss";
import type { PlasmoCSConfig } from "plasmo";


import AutoLikeCSUI from "~cs-helpers/AutoLikeCSUI.svelte";
import {
  OBSERVER_OPTIONS,
  REGEX_SUPPORTED_PAGES,
  SELECTORS,
  getContainerRateButtons,
  getElementByMutationObserver,
  getRateButtons,
  getRatedButton,
  getVisibleElement
} from "~utils-initials";

const storageSync = new Storage({ area: "sync" });
let gTitleLast = "";
let gUrlLast = "";
let csui;
const ID_ELEMENT = "ytr-percentage";

const getIsLiveOrPremiere = (): boolean => Boolean(getVisibleElement(SELECTORS.liveBadge));

function injectComponent({
  elPercentage,
  isAutoLike,
  autoLikeThreshold
}: {
  elPercentage: Element;
  autoLikeThreshold: number;
  isAutoLike: boolean;
}): unknown {
  return new AutoLikeCSUI({
    target: elPercentage,
    props: {
      isAutoLike,
      autoLikeThreshold
    }
  });
}

async function prepareToInjectComponent({ elContainer }: { elContainer: HTMLElement }): Promise<void> {
  let elPercentage = elContainer.querySelector(`#${ID_ELEMENT}`);
  if (elPercentage) {
    return;
  }

  elPercentage = document.createElement("span");
  elPercentage.id = ID_ELEMENT;
  elContainer.prepend(elPercentage);

  csui = injectComponent({
    elPercentage,
    isAutoLike: await storageSync.get<boolean>("isAutoLike"),
    autoLikeThreshold: await storageSync.get<number>("autoLikeThreshold")
  });
}

const PLAYER_OBSERVER = new MutationObserver(async () => {
  const elVideo = getVisibleElement(SELECTORS.video);
  if (!elVideo) {
    return;
  }

  const [elLike] = getRateButtons();
  const elContainer = getContainerRateButtons();
  const isRated = Boolean(getRatedButton()) || window.ytrUserInteracted;
  const isLiveOrPremiere = getIsLiveOrPremiere();
  // Start the time counting only when the rating buttons have loaded
  if (!elLike || !elContainer) {
    //
    return;
  }

  // and the video is not rated or live/premiere
  if (isRated || isLiveOrPremiere) {
    const elPercentage = elContainer.querySelector(`#${ID_ELEMENT}`);
    elPercentage?.remove();
    PLAYER_OBSERVER.disconnect();
    return;
  }

  await prepareToInjectComponent({ elContainer });
  if (!csui) {
    //
    return;
  }
  csui.stopTracking();
  csui.startTracking();

  PLAYER_OBSERVER.disconnect();

  elVideo.addEventListener(
    "canplay",
    () => {
      if (getIsLiveOrPremiere()) {
        csui.stopTracking();
      }
    },
    { once: true }
  );
});

function addTemporaryBodyListener(): void {
  if (gTitleLast === document.title || gUrlLast === location.href) {
    return;
  }

  // Runs only on /watch & /shorts pages
  if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
    return;
  }

  gTitleLast = document.title;
  gUrlLast = location.href;
  window.ytrUserInteracted = false;

  PLAYER_OBSERVER.observe(document, OBSERVER_OPTIONS);
}

async function addGlobalEventListener(): Promise<void> {
  // Fires when navigating to another page
  const elTitle =
    document.documentElement.querySelector(SELECTORS.title) || (await getElementByMutationObserver(SELECTORS.title));
  new MutationObserver(addTemporaryBodyListener).observe(elTitle, OBSERVER_OPTIONS);
}
function appendStyle(): void {
  const elStyle = document.createElement("style");
  elStyle.textContent = styleText;
  document.head.append(elStyle);
}

function addInitialLoader(): void {
  addGlobalEventListener();

  // Runs only on /watch & /shorts pages
  if (location.pathname.match(REGEX_SUPPORTED_PAGES)) {
    PLAYER_OBSERVER.observe(document, OBSERVER_OPTIONS);
  }
}

function init(): void {
  appendStyle();
  addInitialLoader();
}

init();

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"]
};
