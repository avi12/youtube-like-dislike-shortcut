"use strict";

import { rateVideo } from "./content-script-youtube-rate-buttons";
import { ButtonTrigger, ButtonTriggers, SupportedActions } from "../types";
import { getStorage, initial } from "../utils-initials";

let gLastTrigger: ButtonTriggers;

async function init(): Promise<void> {
  try {
    gLastTrigger = ((await getStorage("local", "buttonTrigger")) ?? initial.buttonTriggers) as ButtonTriggers;
  } catch {
    gLastTrigger = initial.buttonTriggers;
  }
}

init();

chrome.storage.onChanged.addListener(async changes => {
  if (changes.buttonTriggers) {
    gLastTrigger = changes.buttonTriggers.newValue as ButtonTriggers;
  }
});

document.addEventListener(
  "keydown",
  e => {
    const isFocusedOnInput =
      document.activeElement.matches("input") ||
      document.activeElement.getAttribute("contenteditable") === "true"; // A comment field

    // We want the shortcut keys to apply only when no text field is focused
    if (isFocusedOnInput) {
      return;
    }

    rateIfNeeded(e);
  },
  { capture: true }
);

function getActionPressed(e: KeyboardEvent): SupportedActions | null {
  for (const actionTypeRaw in gLastTrigger) {
    const actionType = <SupportedActions>actionTypeRaw;
    const action = <ButtonTrigger>gLastTrigger[actionType];
    const isPressedSecondary = e.code !== "" && action.secondary === e.code;
    const isPressedPrimary = action.primary === e.code && action.modifiers.every(modifier => e[modifier]);
    if (isPressedPrimary || isPressedSecondary) {
      return actionType;
    }
  }
  return null;
}

function rateIfNeeded(e: KeyboardEvent): void {
  switch (getActionPressed(e)) {
    case "like":
      e.stopPropagation();
      rateVideo(true);
      break;

    case "dislike":
      e.stopPropagation();
      rateVideo(false);
      break;

    case "unrate":
      e.stopPropagation();
      rateVideo(null);
      break;
  }
}
