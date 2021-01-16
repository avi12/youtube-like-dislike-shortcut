"use strict";

function getIsActive(button) {
  return button.classList.contains("style-default-active");
}

/**
 * Rates/un-rates a video on YouTUbe.com
 * @param {boolean|null} isLike
 */
export function rateVideo(isLike) {
  // noinspection CssInvalidHtmlTagReference
  const [btnLike, btnDislike] = document.querySelectorAll(
    "#top-level-buttons > ytd-toggle-button-renderer.force-icon-button"
  );
  if (isLike) {
    if (!getIsActive(btnLike)) {
      btnLike.click();
      btnLike.blur();
    }
  } else if (isLike === false && !getIsActive(btnDislike)) {
    btnDislike.click();
    btnDislike.blur();
  } else { // isLike === null
    // Un-rate a video
    const btnActive = document.querySelector(".style-default-active");
    if (btnActive) {
      btnActive.click();
      btnActive.blur();
    }
  }
}
