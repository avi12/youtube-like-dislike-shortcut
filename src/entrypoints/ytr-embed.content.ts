import { storage } from "#imports";
import { Rating } from "@/lib/types";
import { getActionPressed, getStorage, initial, ShortcutType, StorageKey } from "@/lib/utils-initials";
import { showRateBezel } from "@/lib/ytr-bezel";
import { RateAction, sendRateRequest } from "@/lib/ytr-messaging";

const ratingForAction: Record<RateAction, Rating | null> = {
  [RateAction.LIKE]: Rating.LIKE,
  [RateAction.DISLIKE]: Rating.DISLIKE,
  [RateAction.REMOVELIKE]: null
};

const rateActionMap: Record<ShortcutType, RateAction> = {
  [ShortcutType.LIKE]: RateAction.LIKE,
  [ShortcutType.DISLIKE]: RateAction.DISLIKE,
  [ShortcutType.UNRATE]: RateAction.REMOVELIKE
};

let gLastRating = Rating.LIKE;

async function rateIfNeeded(event: KeyboardEvent) {
  const shortcutType = getActionPressed(event, window.ytrLastButtonTriggers);
  if (!shortcutType) {
    return;
  }

  event.stopPropagation();
  event.preventDefault();
  const action = rateActionMap[shortcutType];
  const result = await sendRateRequest(action).catch(() => null);
  if (!result?.success) {
    return;
  }

  const rating = ratingForAction[action];
  if (rating) {
    gLastRating = rating;
  }

  showRateBezel(gLastRating, rating !== null);
}

async function init() {
  window.ytrLastButtonTriggers = await getStorage({
    storageKey: StorageKey.BUTTON_TRIGGERS,
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  document.addEventListener(
    "keydown",
    event => {
      const { activeElement } = document;
      const isFocusedOnInput = activeElement?.matches("input, [contenteditable='true']") ?? false;
      if (isFocusedOnInput) {
        return;
      }

      void rateIfNeeded(event);
    },
    { capture: true }
  );

  storage.watch<typeof initial.buttonTriggers>(StorageKey.BUTTON_TRIGGERS, buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers || initial.buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/embed/*", "https://www.youtube-nocookie.com/embed/*"],
  allFrames: true,
  main: () => init()
});
