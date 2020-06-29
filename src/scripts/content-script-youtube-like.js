document.addEventListener(
  "keydown",
  (e) => {
    const isFocusedOnInput =
      document.activeElement.matches("input") ||
      document.activeElement.getAttribute("contenteditable") === "true"; // the comment field

    const isVideoPage = location.pathname === "/watch";
    // We want the + / - keys to apply only when no text fields is focused,
    // as well as when we're in a video page
    if (isFocusedOnInput || !isVideoPage) {
      return;
    }

    const [btnLike, btnDislike] = document.querySelectorAll(
      "ytd-toggle-button-renderer"
    );
    hitButtonIfNeeded({ e, btnLike, btnDislike });
  },
  { capture: true } // Thanks to capturing, e.preventDefault() is able to prevent the CC-related increase/decrease
);

function hitButtonIfNeeded({ e, btnLike, btnDislike }) {
  const { code, key, shiftKey } = e;
  const isHittingLikeOrDislike = key.match(/[+_-]/);
  if (!isHittingLikeOrDislike) {
    return;
  }

  switch (key) {
    case "+": // Numpad + AND Shift + =
      // We want to prevent the default behavior, which in this case is increase the CC size
      e.preventDefault();
      btnLike.click();
      break;

    case "-": // Numpad -
      // The user may press the "-" in the Numpad or in the number row; we want to account for them
      if (code.includes("Numpad") || shiftKey) {
        // We want to prevent the default behavior, which in this case is decrease the CC size
        e.preventDefault();
        btnDislike.click();
      }
      break;

    case "_": // Shift + -
      // We want to prevent the default behavior, which in this case is decrease the CC size
      e.preventDefault();
      btnDislike.click();
      break;
  }
}
