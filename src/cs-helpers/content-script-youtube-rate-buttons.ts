import { Storage } from "@plasmohq/storage";
import { svgs } from "~cs-helpers/icons";
import { getElementByMutationObserver, getVisibleElement, SELECTORS } from "~utils-initials";

const storageLocal = new Storage({ area: "local" });

let gLastRating: "like" | "dislike";

function getIsActive(elButton: HTMLElement): boolean {
  return elButton.ariaPressed === "true";
}

function getIsInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= document.documentElement.clientHeight &&
    rect.right <= document.documentElement.clientWidth
  );
}

function getIsVisible(element: HTMLElement): boolean {
  return element.offsetWidth > 0 && element.offsetHeight > 0;
}

export function getRateButtons(): HTMLButtonElement[] {
  const elButtonsRate = getContainerRateButtons();
  if (!elButtonsRate) {
    return [];
  }
  return [...elButtonsRate.querySelectorAll("button")] as HTMLButtonElement[];
}

function getContainerRateButtons(): HTMLButtonElement {
  const { toggleButtonsNormalVideo, toggleButtonsShortsVideo } = SELECTORS;
  const elButtons = document.querySelectorAll(`${toggleButtonsNormalVideo}, ${toggleButtonsShortsVideo}`);
  return [...elButtons].find(getIsShorts() ? getIsInViewport : getIsVisible) as HTMLButtonElement;
}

export function getIsShorts(): boolean {
  return location.pathname.startsWith("/shorts/");
}

function showIndicator(isRated: boolean): void {
  if (getIsShorts()) {
    return;
  }

  const elBezelContainer = getBezelContainer();
  const elBezel = elBezelContainer.querySelector<HTMLDivElement>(SELECTORS.bezel);
  const elBezelIcon = elBezelContainer.querySelector<HTMLDivElement>(SELECTORS.bezelIcon);
  const { parentElement: elBezelTextWrapperContainer } = elBezelContainer.querySelector<HTMLDivElement>(
    SELECTORS.bezelTextWrapper
  );
  const iconName = isRated ? gLastRating : `un${gLastRating}`;
  elBezelIcon.innerHTML = svgs[iconName];

  elBezelTextWrapperContainer.className = SELECTORS.bezelTextHide.substring(1);

  elBezelContainer.style.display = "";
  elBezel.ariaLabel = "";
}

function getBezelContainer(): HTMLDivElement {
  return document.querySelector(SELECTORS.bezelTextWrapper).parentElement as HTMLDivElement;
}

function clearAnimationOnEnd(): void {
  const elBezelContainer = getBezelContainer();
  elBezelContainer.addEventListener(
    "animationend",
    () => {
      elBezelContainer.style.display = "none";
    },
    { once: true }
  );
}

export function getRatedButton(): HTMLButtonElement {
  const { toggleButtonsShortsVideo, toggleButtonsNormalVideo } = SELECTORS;
  return getVisibleElement(`${toggleButtonsNormalVideo}, ${toggleButtonsShortsVideo}`).querySelector(
    "button[aria-pressed=true]"
  );
}

export async function getIsSubscribed(): Promise<boolean> {
  const elSubscribe =
    getVisibleElement(SELECTORS.buttonSubscribe) || (await getElementByMutationObserver(SELECTORS.buttonSubscribe));
  return elSubscribe.getAttribute("subscribed") !== null;
}

/**
 * Rates/un-rates a video on YouTube.com
 */
export async function rateVideo(isLike: boolean | null): Promise<void> {
  const [elLike, elDislike] = getRateButtons();
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
