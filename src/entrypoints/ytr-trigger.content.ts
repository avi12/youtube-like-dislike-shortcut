import { storage } from "#imports";
import { type Modifier } from "@/lib/types";
import { getStorage, initial, keyToModifier, StorageKey } from "@/lib/utils-initials";
import { rateVideo } from "@/lib/ytr-buttons";
import { defaultAdditionalShortcuts, ShortcutType } from "./popup/sections/keyboard.svelte.js";

function getSecondaryKeyFromPrimary({
  modifiers,
  primary
}: {
  modifiers: Modifier[];
  primary: string[];
}) {
  const formattedModifiers = modifiers.map(keyToModifier).join(" + ");
  const formattedPrimary = (formattedModifiers ? `${formattedModifiers} + ` : "") + primary.join(" + ");
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
    if (isComboPressed({
      modifiers,
      primary,
      event 
    })) {
      return actionName;
    }

    if (secondary) {
      const secondaryKey = getSecondaryKeyFromPrimary({
        primary,
        modifiers 
      });
      if (secondaryKey === event.code) {
        return actionName;
      }
    }
  }
  return null;
}

async function rateIfNeeded(e: KeyboardEvent) {
  switch (getActionPressed(e)) {
    case ShortcutType.like:
      e.stopPropagation();
      await rateVideo(true);
      break;

    case ShortcutType.dislike:
      e.stopPropagation();
      await rateVideo(false);
      break;

    case ShortcutType.unrate:
      e.stopPropagation();
      await rateVideo(null);
      break;
  }
}

async function init() {
  window.ytrLastButtonTriggers = await getStorage({
    storageKey: StorageKey.buttonTriggers,
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  document.addEventListener("keydown", async e => {
    const isFocusedOnInput = document.activeElement?.matches("input, [contenteditable='true']") ?? false;

    if (isFocusedOnInput) {
      return;
    }

    await rateIfNeeded(e);
  }, { capture: true });

  storage.watch<typeof initial.buttonTriggers>(StorageKey.buttonTriggers, buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers || initial.buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main: () => init()
});
