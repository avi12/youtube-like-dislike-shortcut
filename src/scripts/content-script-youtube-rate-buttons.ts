"use strict";

function getIsActive(elButton: HTMLElement): boolean {
  return elButton.classList.contains("style-default-active");
}

function getLikeButtons(): HTMLButtonElement[] {
  const elButtons = document.querySelectorAll(
    "#top-level-buttons-computed > ytd-toggle-button-renderer"
  );
  return [...elButtons].filter(
    (elButton: HTMLButtonElement) => elButton.offsetWidth > 0 && elButton.offsetHeight > 0
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
