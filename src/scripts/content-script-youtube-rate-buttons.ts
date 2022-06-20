"use strict";

import { svgs } from "./icons";
import { Selectors } from "../utils-initials";

let gLastRating: "like" | "dislike";

export function getIsActive(elButton: HTMLElement): boolean {
  return elButton.classList.contains(Selectors.activeButton.substring(1));
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
  const { toggleButtonsNormalVideo, toggleButtonsShortsVideo } = Selectors;
  const elButtons = document.querySelectorAll(`${toggleButtonsNormalVideo}, ${toggleButtonsShortsVideo}`);
  return [...elButtons].filter(getIsShorts() ? getIsInViewport : getIsVisible) as HTMLButtonElement[];
}

function getIsShorts(): boolean {
  return location.pathname.startsWith("/shorts/");
}

function showIndicator(isRated: boolean): void {
  if (getIsShorts()) {
    return;
  }

  const elBezelContainer = getBezelContainer();
  const elBezel = elBezelContainer.querySelector<HTMLDivElement>(Selectors.bezel);
  const elBezelIcon = elBezelContainer.querySelector<HTMLDivElement>(Selectors.bezelIcon);
  const { parentElement: elBezelTextWrapperContainer } = elBezelContainer.querySelector<HTMLDivElement>(
    Selectors.bezelTextWrapper
  );
  const iconName = isRated ? gLastRating : `un${gLastRating}`;
  elBezelIcon.innerHTML = svgs[iconName];

  elBezelTextWrapperContainer.className = Selectors.bezelTextHide.substring(1);

  elBezelContainer.style.display = "";
  elBezel.ariaLabel = "";
}

function getBezelContainer(): HTMLDivElement {
  return document.querySelector(Selectors.bezel).parentElement as HTMLDivElement;
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

export function getActiveButton(): HTMLButtonElement {
  return document.querySelector(Selectors.activeButton);
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
  } else if (isLike === false) {
    gLastRating = "dislike";
    showIndicator(true);

    if (!getIsActive(elDislike)) {
      elDislike.click();
      elDislike.blur();
    }
  } else {
    // isLike === null
    // Un-rate a video
    const elBtnActive = getActiveButton();

    if (!gLastRating) {
      gLastRating = elBtnActive === elDislike ? "dislike" : "like";
    }
    showIndicator(false);

    if (elBtnActive) {
      elBtnActive.click();
      elBtnActive.blur();
    }
  }
}
