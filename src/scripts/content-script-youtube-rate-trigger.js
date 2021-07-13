"use strict";

import { rateVideo } from "./content-script-youtube-rate-buttons";

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

    rateIfNeeded(e);
  },
  { capture: true } // Thanks to capturing, e.stopPropagation() is able to prevent the CC-related increase/decrease
);

function rateIfNeeded(e) {
  const { code, key, shiftKey } = e;
  const isHittingLikeOrDislike = key.match(/[+_()-]/);
  if (!isHittingLikeOrDislike) {
    return;
  }

  switch (key) {
    case "+": // Numpad + AND Shift + =
      rateVideo(true);
      // We want to stop the event propagation, which will stop the default behavior - increase the CC size, in this case
      e.stopPropagation();
      break;

    case "-": // Numpad -
      // The user may press the "-" in the Numpad or in the number row; we want to account for both
      if (code.includes("Numpad") || shiftKey) {
        // We want to stop the event propagation, which in this case is decrease the CC size
        rateVideo(false);
        e.stopPropagation();
      }
      break;

    case "_": // Shift + -
      rateVideo(false);
      e.stopPropagation();
      break;

    case ")":
    case "(":
      // Shift + 0
      rateVideo(null);
      e.stopPropagation();
      break;
  }
}
