import { settings } from "@/lib/settings";
import { getActionPressed, ShortcutType } from "@/lib/utils-initials";
import { rateVideo } from "@/lib/ytr-buttons";

async function rateIfNeeded(event: KeyboardEvent) {
  switch (
    getActionPressed({
      event,
      buttonTriggers: window.ytrLastButtonTriggers
    })
  ) {
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
  window.ytrLastButtonTriggers = await settings.buttonTriggers.read();

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

  settings.buttonTriggers.watch(buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://*.youtube.com/*"],
  main: () => init()
});
