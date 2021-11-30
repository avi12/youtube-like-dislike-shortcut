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
    // and of course when we're on a video page
    if (isFocusedOnInput || !isVideoPage) {
      return;
    }

    rateIfNeeded(e);
  },
  { capture: true } // Thanks to capturing, e.stopPropagation() is able to prevent the CC-related increase/decrease
);

function rateIfNeeded(e: KeyboardEvent) {
  const { code, key, shiftKey } = e;
  const isHittingLikeOrDislike = key.match(/[+_-]/) || code === "Digit0";
  if (!isHittingLikeOrDislike) {
    return;
  }

  const isLiked = key === "+";
  if (isLiked) {
    rateVideo(true);
    // We want to stop the event propagation, which will stop the default behavior - increase the CC size, in this case
    e.stopPropagation();
    return;
  }

  const isDisliked = (key === "-" && !shiftKey) || (key === "_" && shiftKey);
  if (isDisliked) {
    rateVideo(false);

    // We want to stop the event propagation, which will stop the default behavior - decrease the CC size, in this case
    e.stopPropagation();
    return;
  }

  const isUnrated = code === "Digit0" && shiftKey;
  if (isUnrated) {
    rateVideo(null);
    e.stopPropagation();
  }
}
