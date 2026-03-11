export const defaultAdditionalShortcuts: Record<string, string | undefined> = {
  "Shift + Equal": "NumpadAdd",
  "Shift + Minus": "NumpadSubtract",
  "Shift + Digit8": "NumpadMultiply",
  "Shift + Slash": "NumpadDivide",
  "Shift + Period": "NumpadDecimal"
};
export const defaultShortcuts = {
  like: ["shiftKey", "Equal"],
  dislike: ["shiftKey", "Minus"],
  unrate: ["shiftKey", "Digit0"]
};
export const ShortcutType = {
  like: "like",
  dislike: "dislike",
  unrate: "unrate"
} as const;
export type ShortcutType = (typeof ShortcutType)[keyof typeof ShortcutType];

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
