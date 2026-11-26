import { settings } from "@/lib/settings";
import { Rating } from "@/lib/types";
import { getActionPressed, ShortcutType } from "@/lib/utils-initials";
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
  const shortcutType = getActionPressed({
    event,
    buttonTriggers: window.ytrLastButtonTriggers
  });
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

  showRateBezel({
    rating: gLastRating,
    isRated: rating !== null
  });
}

async function init() {
  window.ytrLastButtonTriggers = await settings.buttonTriggers.read();

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

  settings.buttonTriggers.watch(buttonTriggers => {
    window.ytrLastButtonTriggers = buttonTriggers;
  });
}

export default defineContentScript({
  matches: ["https://www.youtube.com/embed/*", "https://www.youtube-nocookie.com/embed/*"],
  allFrames: true,
  main: () => init()
});
