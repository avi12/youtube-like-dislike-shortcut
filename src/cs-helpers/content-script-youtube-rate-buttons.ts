import { svgs } from "~icons";
import { SELECTORS, getRatedButton, getRateButtons, getIsShorts } from "~utils-initials";

let gLastRating: "like" | "dislike";

function getIsActive(elButton: HTMLElement): boolean {
  return elButton.ariaPressed === "true";
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

/**
 * Rates/un-rates a video on YouTube.com
 */
export function rateVideo(isLike: boolean | null): void {
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
