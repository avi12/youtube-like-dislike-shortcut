"use strict";

function getIsActive(button) {
  return button.classList.contains("style-default-active");
}

/**
 * @returns {HTMLElement[]}
 */
function getLikeButtons() {
  // noinspection CssInvalidHtmlTagReference
  const elButtons = document.querySelectorAll(
    "#top-level-buttons-computed > ytd-toggle-button-renderer"
  );
  return [...elButtons].filter(
    elButton => elButton.offsetWidth > 0 && elButton.offsetHeight > 0
  );
}

/**
 * Rates/un-rates a video on YouTUbe.com
 * @param {boolean|null} isLike
 */
export function rateVideo(isLike) {
  const [btnLike, btnDislike] = getLikeButtons();
  if (isLike) {
    if (!getIsActive(btnLike)) {
      btnLike.click();
      btnLike.blur();
    }
  } else if (isLike === false && !getIsActive(btnDislike)) {
    btnDislike.click();
    btnDislike.blur();
  } else {
    // isLike === null
    // Un-rate a video
    const btnActive = document.querySelector(".style-default-active");
    if (btnActive) {
      btnActive.click();
      btnActive.blur();
    }
  }
}
