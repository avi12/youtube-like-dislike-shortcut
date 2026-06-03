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

export function initializeKeys({ like, dislike, unrate }: ButtonTriggers) {
  keys.combos = {
    like: [...like.modifiers, ...like.primary],
    dislike: [...dislike.modifiers, ...dislike.primary],
    unrate: [...unrate.modifiers, ...unrate.primary]
  };
  keys.combosSecondary = {
    [ShortcutType.like]: like.secondary,
    [ShortcutType.dislike]: dislike.secondary,
    [ShortcutType.unrate]: unrate.secondary
  };
}
