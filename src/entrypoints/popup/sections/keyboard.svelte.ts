import { type ButtonTriggers } from "@/lib/types";
import { defaultAdditionalShortcuts, ShortcutType } from "@/lib/utils-initials";

export { defaultAdditionalShortcuts, ShortcutType };

export const defaultShortcuts = {
  like: ["shiftKey", "Equal"],
  dislike: ["shiftKey", "Minus"],
  unrate: ["shiftKey", "Digit0"]
};

export const keys = $state<{
  combos: typeof defaultShortcuts;
  combosSecondary: Record<ShortcutType, boolean>;
  isRecording: boolean;
  currentlyRecording: ShortcutType | null;
}>({
  combos: defaultShortcuts,
  combosSecondary: {
    [ShortcutType.like]: false,
    [ShortcutType.dislike]: false,
    [ShortcutType.unrate]: false
  },
  isRecording: false,
  currentlyRecording: null
});

export function initializeKeys(buttonTriggers: ButtonTriggers) {
  keys.combos = {
    like: [...buttonTriggers.like.modifiers, ...buttonTriggers.like.primary],
    dislike: [...buttonTriggers.dislike.modifiers, ...buttonTriggers.dislike.primary],
    unrate: [...buttonTriggers.unrate.modifiers, ...buttonTriggers.unrate.primary]
  };
  keys.combosSecondary = {
    [ShortcutType.like]: buttonTriggers.like.secondary,
    [ShortcutType.dislike]: buttonTriggers.dislike.secondary,
    [ShortcutType.unrate]: buttonTriggers.unrate.secondary
  };
}
