import { ButtonTriggers } from "./types";

export async function getStorage(storageArea: "local" | "sync", key: string): Promise<unknown> {
  return new Promise(resolve =>
    chrome.storage[storageArea].get(key, result => resolve(result[key]))
  );
}

export const initial = {
  buttonTriggers: {
    like: {
      primary: "Equal",
      modifiers: ["shiftKey"],
      secondary: "NumpadAdd"
    },
    dislike: {
      primary: "Minus",
      modifiers: ["shiftKey"],
      secondary: "NumpadSubtract"
    },
    unrate: {
      primary: "Digit0",
      modifiers: ["shiftKey"],
      secondary: ""
    }
  } as ButtonTriggers
} as const;