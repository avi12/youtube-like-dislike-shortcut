import { Storage } from "@plasmohq/storage";
import type { PlasmoCSConfig } from "plasmo";
import { rateVideo } from "~cs-helpers/cs-helper-ytr-buttons";
import { defaultAdditionalShortcuts } from "~popup/popup/sections/store-keyboard";
import type { ButtonTriggers, SupportedActions } from "~types";
import { getStorage, initial, keyToModifier, MODIFIER_KEYS } from "~utils-initials";

let gLastTriggers: ButtonTriggers;
const storageLocal = new Storage({ area: "local" });
type Modifier = (typeof MODIFIER_KEYS)[number];

document.addEventListener(
  "keydown",
  e => {
    const isFocusedOnInput =
      document.activeElement.matches("input") || document.activeElement.getAttribute("contenteditable") === "true"; // A comment field

    // We want the shortcut keys to apply only when no text field is focused
    if (isFocusedOnInput) {
      return;
    }

    rateIfNeeded(e);
  },
  { capture: true }
);

function getSecondaryKeyFromPrimary({
  modifiers,
  primary
}: {
  modifiers: Modifier[];
  primary: string[];
}): string | null {
  const formattedModifiers = modifiers.map(keyToModifier).join(" + ");
  const formattedPrimary = formattedModifiers + " + " + primary.join(" + ");
  return defaultAdditionalShortcuts[formattedPrimary];
}

function isComboPressed({
  modifiers,
  primary,
  event
}: {
  modifiers: Modifier[];
  primary: string[];
  event: KeyboardEvent;
}): boolean {
  if (!primary.includes(event.code)) {
    return false;
  }
  return modifiers.every(modifier => event[modifier]);
}

function getActionPressed(event: KeyboardEvent): SupportedActions | null {
  for (const actionName in gLastTriggers) {
    const { primary, modifiers, secondary } = gLastTriggers[actionName];
    if (isComboPressed({ modifiers, primary, event })) {
      return actionName as SupportedActions;
    }

    if (secondary) {
      const secondaryKey = getSecondaryKeyFromPrimary({ primary, modifiers });
      if (secondaryKey === event.code) {
        return actionName as SupportedActions;
      }
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

async function init() {
  gLastTriggers = await getStorage({
    area: "local",
    key: "buttonTriggers",
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  storageLocal.watch({
    buttonTriggers({ newValue: buttonTriggers }: { newValue: typeof initial.buttonTriggers }) {
      gLastTriggers = buttonTriggers;
    }
  });
}

init();

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*"]
};
