import { writable } from "svelte/store";

export const defaultAdditionalShortcuts = {
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
export type ShortcutType = "like" | "dislike" | "unrate";
export type ShortcutTypeSecondary = {
  [key in ShortcutType]: boolean;
}

export const keyCombos = writable<typeof defaultShortcuts>();
export const keyCombosSecondary = writable<ShortcutTypeSecondary>();
export const isRecording = writable<boolean>(false);
export const currentlyRecording = writable<ShortcutType>(null);
