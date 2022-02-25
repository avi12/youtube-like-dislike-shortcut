"use strict";

import { svgs } from "./icons";

const gSelBezel = ".ytp-bezel";
const gSelBezelIcon = ".ytp-bezel-icon";
let gLastRating: "like" | "dislike";

function getIsActive(elButton: HTMLElement): boolean {
  return elButton.classList.contains("style-default-active");
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

function getRateButtons(): HTMLButtonElement[] {
  const selToggleButtonsNormalVideo = "#top-level-buttons-computed > ytd-toggle-button-renderer";
  const selToggleButtonsShortsVideo = "ytd-like-button-renderer > ytd-toggle-button-renderer";
  const elButtons = document.querySelectorAll(
    `${selToggleButtonsNormalVideo}, ${selToggleButtonsShortsVideo}`
  );
  return [...elButtons].filter(
    getIsShorts() ? getIsInViewport : getIsVisible
  ) as HTMLButtonElement[];
}

function getIsShorts() {
  return location.pathname.startsWith("/shorts/");
}

function showIndicator(isRated = true): void {
  if (!getIsShorts()) {
    const elBezelContainer = getBezelContainer();
    const elBezel = elBezelContainer.querySelector<HTMLDivElement>(gSelBezel);
    const elBezelIcon = elBezelContainer.querySelector<HTMLDivElement>(gSelBezelIcon);
    const iconName = isRated ? gLastRating : `un${gLastRating}`;
    elBezelIcon.innerHTML = svgs[iconName];
    elBezelContainer.style.display = "";
    elBezel.ariaLabel = "";
  }
}

function getBezelContainer(): HTMLDivElement {
  return document.querySelector(gSelBezel).parentElement as HTMLDivElement;
}

function clearAnimationOnEnd() {
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

  if (isLike) {
    gLastRating = "like";
    showIndicator();

    if (!getIsActive(elLike)) {
      elLike.click();
      elLike.blur();
    }
  } else if (isLike === false) {
    gLastRating = "dislike";
    showIndicator();

    if (!getIsActive(elDislike)) {
      elDislike.click();
      elDislike.blur();
    }
  } else {
    // isLike === null
    // Un-rate a video
    const elBtnActive = document.querySelector(".style-default-active") as HTMLElement;

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
