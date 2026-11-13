import { storage } from "#imports";
import { getActionPressed, getStorage, initial, ShortcutType, StorageKey } from "@/lib/utils-initials";
import { rateVideo } from "@/lib/ytr-buttons";

async function rateIfNeeded(event: KeyboardEvent) {
  switch (getActionPressed(event, window.ytrLastButtonTriggers)) {
    case ShortcutType.LIKE:
      event.stopPropagation();
      event.preventDefault();
      await rateVideo(true);
      break;

    case ShortcutType.DISLIKE:
      event.stopPropagation();
      event.preventDefault();
      await rateVideo(false);
      break;

    case ShortcutType.UNRATE:
      event.stopPropagation();
      event.preventDefault();
      await rateVideo(null);
      break;
  }
}

async function init() {
  window.ytrLastButtonTriggers = await getStorage({
    storageKey: StorageKey.BUTTON_TRIGGERS,
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  document.addEventListener(
    "keydown",
    async event => {
      const { activeElement } = document;
      const isFocusedOnInput = activeElement?.matches("input, [contenteditable='true']") ?? false;
      if (isFocusedOnInput) {
        return;
      }

      await rateIfNeeded(event);
    },
    { capture: true }
  );

  storage.watch<typeof initial.buttonTriggers>(StorageKey.BUTTON_TRIGGERS, buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers || initial.buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://*.youtube.com/*"],
  main: () => init()
});
