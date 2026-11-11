import { storage } from "#imports";
import { Rating } from "@/lib/types";
import {
  getActionPressed,
  getStorage,
  initial,
  ShortcutType,
  StorageKey
} from "@/lib/utils-initials";
import { showRateBezel } from "@/lib/ytr-bezel";
import { RateAction, sendRateRequest } from "@/lib/ytr-messaging";

const ratingForAction: Record<RateAction, Rating | null> = {
  [RateAction.like]: Rating.Like,
  [RateAction.dislike]: Rating.Dislike,
  [RateAction.removelike]: null
};

const rateActionMap: Record<ShortcutType, RateAction> = {
  [ShortcutType.like]: RateAction.like,
  [ShortcutType.dislike]: RateAction.dislike,
  [ShortcutType.unrate]: RateAction.removelike
};

let gLastRating = Rating.Like;

async function rateIfNeeded(e: KeyboardEvent) {
  const shortcutType = getActionPressed(e, window.ytrLastButtonTriggers);
  if (!shortcutType) {
    return;
  }
  e.stopPropagation();
  e.preventDefault();
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
    storageKey: StorageKey.buttonTriggers,
    fallback: initial.buttonTriggers,
    updateWindowKey: "ytrLastButtonTriggers"
  });

  document.addEventListener("keydown", e => {
    const { activeElement } = document;
    const isFocusedOnInput = activeElement?.matches("input, [contenteditable='true']") ?? false;
    if (isFocusedOnInput) {
      return;
    }
    void rateIfNeeded(e);
  }, { capture: true });

  storage.watch<typeof initial.buttonTriggers>(StorageKey.buttonTriggers, buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers || initial.buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/embed/*", "https://www.youtube-nocookie.com/embed/*"],
  allFrames: true,
  main: () => init()
});
