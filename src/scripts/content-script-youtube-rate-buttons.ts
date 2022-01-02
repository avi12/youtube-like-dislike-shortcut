"use strict";

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

function getLikeButtons(): HTMLButtonElement[] {
  const elButtons = document.querySelectorAll(
    "#top-level-buttons-computed > ytd-toggle-button-renderer, ytd-like-button-renderer > ytd-toggle-button-renderer"
  );
  return [...elButtons].filter(
    location.pathname.startsWith("/shorts/") ? getIsInViewport : getIsVisible
  ) as HTMLButtonElement[];
}

/**
 * Rates/un-rates a video on YouTube.com
 */
export function rateVideo(isLike: boolean | null): void {
  const [elLike, elDislike] = getLikeButtons();
  if (isLike) {
    if (!getIsActive(elLike)) {
      elLike.click();
      elLike.blur();
    }
  } else if (isLike === false) {
    if (!getIsActive(elDislike)) {
      elDislike.click();
      elDislike.blur();
    }
  } else {
    // isLike === null
    // Un-rate a video
    const btnActive = document.querySelector(".style-default-active") as HTMLElement;
    if (btnActive) {
      btnActive.click();
      btnActive.blur();
    }
  }
}
