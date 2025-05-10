import { storage } from "#imports";
import { defaultAdditionalShortcuts, ShortcutType } from "./popup/sections/keyboard.svelte.js";
import { getStorage, initial, keyToModifier, MODIFIER_KEYS } from "@/lib/utils-initials";
import { rateVideo } from "@/lib/ytr-buttons";

type Modifier = (typeof MODIFIER_KEYS)[number];

function getSecondaryKeyFromPrimary({
  modifiers,
  primary
}: {
  modifiers: Modifier[];
  primary: string[];
}): string | null {
  const formattedModifiers = modifiers.map(keyToModifier).join(" + ");
  const formattedPrimary = formattedModifiers + " + " + primary.join(" + ");
  // @ts-expect-error Incompatible types
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

function getActionPressed(event: KeyboardEvent): ShortcutType | null {
  for (const actionName in window.ytrLastButtonTriggers) {
    // @ts-expect-error Incompatible types
    const { primary, modifiers, secondary } = window.ytrLastButtonTriggers[actionName]!;
    if (isComboPressed({ modifiers, primary, event })) {
      return actionName as ShortcutType;
    }

    if (secondary) {
      const secondaryKey = getSecondaryKeyFromPrimary({ primary, modifiers });
      if (secondaryKey === event.code) {
        return actionName as ShortcutType;
      }
    }
  }
  return null;
}

function rateIfNeeded(e: KeyboardEvent): void {
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
  document.addEventListener(
    "keydown",
    e => {
      const isFocusedOnInput =
        document.activeElement!.matches("input") || document.activeElement!.getAttribute("contenteditable") === "true"; // A comment field

      // We want the shortcut keys to apply only when no text field is focused
      if (isFocusedOnInput) {
        return;
      }

      rateIfNeeded(e);
    },
    { capture: true }
  );

  window.ytrLastButtonTriggers = await getStorage({
    area: "local",
    key: "buttonTriggers",
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  storage.watch<typeof initial.buttonTriggers>("local:buttonTriggers", buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers || initial.buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main: () => init()
});
