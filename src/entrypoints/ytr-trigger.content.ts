import { storage } from "#imports";
import { defaultAdditionalShortcuts, ShortcutType } from "./popup/sections/keyboard.svelte.js";
import { type Modifier } from "@/lib/types";
import { getStorage, initial, keyToModifier } from "@/lib/utils-initials";
import { rateVideo } from "@/lib/ytr-buttons";

function getSecondaryKeyFromPrimary({
  modifiers,
  primary
}: {
  modifiers: Modifier[];
  primary: string[];
}) {
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
}) {
  if (!primary.includes(event.code)) {
    return false;
  }
  return modifiers.every(modifier => event[modifier]);
}

function getActionPressed(event: KeyboardEvent) {
  for (const actionName of Object.values(ShortcutType)) {
    const { primary, modifiers, secondary } = window.ytrLastButtonTriggers[actionName];
    if (isComboPressed({ modifiers, primary, event })) {
      return actionName;
    }

    if (secondary) {
      const secondaryKey = getSecondaryKeyFromPrimary({ primary, modifiers });
      if (secondaryKey === event.code) {
        return actionName;
      }
    }
  }
  return null;
}

function rateIfNeeded(e: KeyboardEvent) {
  switch (getActionPressed(e)) {
    case ShortcutType.like:
      e.stopPropagation();
      rateVideo(true);
      break;

    case ShortcutType.dislike:
      e.stopPropagation();
      rateVideo(false);
      break;

    case ShortcutType.unrate:
      e.stopPropagation();
      rateVideo(null);
      break;
  }
}

async function init() {
  window.ytrLastButtonTriggers = await getStorage({
    area: "local",
    key: "buttonTriggers",
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  document.addEventListener("keydown", e => {
    const isFocusedOnInput =
      document.activeElement!.matches("input") || document.activeElement!.getAttribute("contenteditable") === "true"; // A comment field

    // We want the shortcut keys to apply only when no text field is focused
    if (isFocusedOnInput) {
      return;
    }

    rateIfNeeded(e);
  }, { capture: true });

  storage.watch<typeof initial.buttonTriggers>("local:buttonTriggers", buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers || initial.buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main: () => init()
});
