"use strict";

const isMac = navigator.platform.includes("Mac");

export const modifierToKeyDisplay = {
  shiftKey: "Shift",
  ctrlKey: "Ctrl",
  altKey: isMac ? "Option" : "Alt",
  metaKey: isMac ? "Windows" : "Cmd"
} as const;

export const modifierToKeyButton = {
  ShiftLeft: "shiftKey",
  ShiftRight: "shiftKey",
  ControlLeft: "ctrlKey",
  ControlRight: "ctrlKey",
  AltLeft: "altKey",
  AltRight: "altKey",
  MetaLeft: "metaKey",
  MetaRight: "metaKey"
} as const;

export const numpadAliases = {
  "Shift + Equal": "NumpadAdd",
  "Shift + Minus": "NumpadSubtract",
  "Shift + Slash": "NumpadDivide",
  "Shift + Digit8": "NumpadMultiply",
  "Shift + Period": "NumpadDecimal"
} as const;

const ctrlOrOption = isMac ? "Option" : "Ctrl";

// The values are only for the code readers to understand what the buttons are doing
export const buttonTriggersYouTube = {
  KeyK: "Play",
  KeyJ: "Rewind",
  KeyL: "Forward",
  "Shift + KeyP": "Previous video",
  "Shift + KeyN": "Next video",
  Comma: "Previous frame",
  Period: "Next frame",
  [`${ctrlOrOption} + ArrowLeft`]: "Previous chapter",
  [`${ctrlOrOption} + ArrowRight`]: "Next chapter",
  KeyF: "Fullscreen",
  KeyT: "Theater",
  KeyM: "Mute",
  ArrowUp: "Volume up",
  ArrowDown: "Volume down",
  KeyI: "Mini-player",
  KeyC: "CC",
  KeyO: "Text opacity",
  KeyW: "Window opacity",
  Equal: "Increase CC",
  Minus: "Decrease CC"
} as const;

export const actionNameToDisplay = {
  like: "Like",
  dislike: "Dislike",
  unrate: "Un-rate"
} as const;
