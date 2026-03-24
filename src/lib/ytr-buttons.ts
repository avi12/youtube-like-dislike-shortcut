import { svgs } from "@/lib/icons";
import { SELECTORS } from "@/lib/utils-initials";

let gLastRating: "like" | "dislike";

function getIsActive(elButton: HTMLElement) {
  return elButton.ariaPressed === "true";
}

export function getRateButtons() {
  const elButtonsRate = document.querySelector<HTMLLIElement>(
    `${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`
  );
  if (!elButtonsRate) {
    return [];
  }
  return [...elButtonsRate.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")];
}

function getIsShorts() {
  return location.pathname.startsWith("/shorts/");
}

function showIndicator(isRated: boolean) {
  if (getIsShorts()) {
    return;
  }

  const elBezelContainer = getBezelContainer();
  const elBezel = elBezelContainer.querySelector<HTMLDivElement>(SELECTORS.bezel);
  const elBezelIcon = elBezelContainer.querySelector<HTMLDivElement>(SELECTORS.bezelIcon);
  const elBezelTextWrapper = document.querySelector<HTMLElement>(SELECTORS.bezelTextWrapper);
  const iconName: keyof typeof svgs = isRated ? gLastRating : `un${gLastRating}`;
  elBezelIcon!.innerHTML = svgs[iconName];
  if (elBezelTextWrapper) {
    elBezelTextWrapper.style.display = "none";
  }

  elBezelContainer.style.display = "";
  elBezel!.ariaLabel = "";
}

function getBezelContainer() {
  return document.querySelector(SELECTORS.bezelTextWrapper)!.parentElement!;
}

function clearAnimationOnEnd() {
  const elBezelContainer = getBezelContainer();
  const elBezelTextWrapper = document.querySelector<HTMLElement>(SELECTORS.bezelTextWrapper);
  elBezelContainer.addEventListener("animationend", () => {
    elBezelContainer.style.display = "none";
    if (elBezelTextWrapper) {
      elBezelTextWrapper.style.display = "";
    }
  }, { once: true });
}

export function getRatedButton(): HTMLButtonElement {
  const { toggleButtonsShortsVideo, toggleButtonsNormalVideo } = SELECTORS;
  return document.querySelector(`:where(${toggleButtonsNormalVideo}, ${toggleButtonsShortsVideo}) button[aria-pressed=true]`)!;
}

export function getIsSubscribed() {
  const elSubscribe = document.querySelector(SELECTORS.buttonSubscribe);
  return elSubscribe?.getAttribute("subscribed") !== null;
}

/**
 * Rates/un-rates a video on YouTube.com
 */
export function rateVideo(isLike: boolean | null) {
  const [elLike, elDislike] = getRateButtons();
  if (!elLike) {
    return;
  }
  clearAnimationOnEnd();

  window.ytrUserInteracted = true;
  if (isLike) {
    gLastRating = "like";
    showIndicator(true);

    if (!getIsActive(elLike)) {
      elLike.click();
      elLike.blur();
    }
    return;
  }

  if (isLike === false) {
    gLastRating = "dislike";
    showIndicator(true);

    if (!getIsActive(elDislike)) {
      elDislike.click();
      elDislike.blur();
    }
    return;
  }

  // isLike === null
  // Un-rate a video
  const elBtnActive = getRatedButton();

  if (!gLastRating) {
    gLastRating = elBtnActive === elDislike ? "dislike" : "like";
  }
  showIndicator(false);

  if (elBtnActive) {
    elBtnActive.click();
    elBtnActive.blur();
  }
}
