import { Storage } from "@plasmohq/storage";
import type { PlasmoCSConfig } from "plasmo";


import { rateVideo } from "~cs-helpers/content-script-youtube-rate-buttons";
import type { ButtonTrigger, ButtonTriggers, SupportedActions } from "~types";
import { initial } from "~utils-initials";

let gLastTriggers: ButtonTriggers;
const storageLocal = new Storage({ area: "local" });

storageLocal.watch({
  buttonTriggers({ newValue: buttonTriggers }: { newValue: ButtonTriggers }): void {
    gLastTriggers = buttonTriggers;
  }
});

document.addEventListener(
  "keydown",
  e => {
    const isFocusedOnInput =
      document.activeElement.matches("input") || document.activeElement.getAttribute("contenteditable") === "true";

    // We want the shortcut keys to apply only when no text field is focused
    if (!isFocusedOnInput) {
      rateIfNeeded(e);
    }
  },
  { capture: true }
);

function getActionPressed(e: KeyboardEvent): SupportedActions | null {
  for (const actionTypeRaw in gLastTriggers) {
    const actionType = actionTypeRaw as SupportedActions;
    const action = gLastTriggers[actionType] as ButtonTrigger;
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

async function init(): Promise<void> {
  gLastTriggers = (await storageLocal.get("buttonTriggers")) ?? initial.buttonTriggers;
}

init();

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"]
};
