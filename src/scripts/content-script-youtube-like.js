document.addEventListener(
  "keydown",
  e => {
    const isFocusedOnInput =
      document.activeElement.matches("input") ||
      document.activeElement.getAttribute("contenteditable") === "true"; // A comment field

    const isVideoPage = location.pathname === "/watch";
    // We want the + / - keys to apply only when no text fields is focused,
    // as well as when we're in a video page
    if (isFocusedOnInput || !isVideoPage) {
      return;
    }

    const [btnLike, btnDislike] = document.querySelectorAll(
      "#top-level-buttons > ytd-toggle-button-renderer"
    );
    hitButtonIfNeeded(e, btnLike, btnDislike);
  },
  { capture: true } // Thanks to capturing, e.preventDefault() is able to prevent the CC-related increase/decrease
);

function getIsActive(button) {
  return button.classList.contains("style-default-active");
}

function hitButtonIfNeeded(e, btnLike, btnDislike) {
  const { code, key, shiftKey } = e;
  const isHittingLikeOrDislike = key.match(/[+_)-]/);
  if (!isHittingLikeOrDislike) {
    return;
  }

  switch (key) {
    case "+": // Numpad + AND Shift + =
      if (!getIsActive(btnLike)) {
        btnLike.click();
        btnLike.blur();
      }
      // We want to stop the event propagation, which will stop the default behavior - increase the CC size, in this case
      e.stopPropagation();
      break;

    case "-": // Numpad -
      // The user may press the "-" in the Numpad or in the number row; we want to account for both
      if (code.includes("Numpad") || shiftKey) {
        // We want to stop the event propagation, which in this case is decrease the CC size
        if (!getIsActive(btnDislike)) {
          btnDislike.click();
          btnDislike.blur();
        }
        e.stopPropagation();
      }
      break;

    case "_": // Shift + -
      if (!getIsActive(btnDislike)) {
        btnDislike.click();
        btnDislike.blur();
      }
      // We want to stop the event propagation, which will stop the default behavior - decrease the CC size, in this case
      e.stopPropagation();
      break;

    case ")": // Shift + 0
      const btnActive = document.querySelector(".style-default-active");
      if (btnActive) {
        btnActive.click();
        btnActive.blur();
      }
      // We want to stop the event propagation, which will stop the default behavior - seeking to 0% (beginning of the video), in this case
      e.stopPropagation();
  }
}
