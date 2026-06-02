import { storage } from "#imports";
import {
  getActionPressed,
  getStorage,
  initial,
  ShortcutType,
  StorageKey
} from "@/lib/utils-initials";
import { rateVideo } from "@/lib/ytr-buttons";

async function rateIfNeeded(e: KeyboardEvent) {
  switch (getActionPressed(e, window.ytrLastButtonTriggers)) {
    case ShortcutType.like:
      e.stopPropagation();
      e.preventDefault();
      await rateVideo(true);
      break;

    case ShortcutType.dislike:
      e.stopPropagation();
      e.preventDefault();
      await rateVideo(false);
      break;

    case ShortcutType.unrate:
      e.stopPropagation();
      e.preventDefault();
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
  matches: ["https://*.youtube.com/*"],
  main: () => init()
});
