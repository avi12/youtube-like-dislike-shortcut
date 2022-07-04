import type { ButtonTriggers } from "./types";

export async function getStorage(storageArea: "local" | "sync", key: string): Promise<unknown> {
  return new Promise(resolve => chrome.storage[storageArea].get(key, result => resolve(result[key])));
}

export enum Selectors {
  video = "video",
  adSkipIn = ".ytp-ad-preview-text",
  adSkipNow = ".ytp-ad-skip-button-text",
  live = ".ytp-live-badge",
  percentageWatched = ".ytr-percentage",
  toggleButtonsNormalVideo = "#top-level-buttons-computed > ytd-toggle-button-renderer",
  toggleButtonsShortsVideo = "ytd-like-button-renderer > ytd-toggle-button-renderer",
  activeButton = ".style-default-active",
  // Bezel classes
  bezel = ".ytp-bezel",
  bezelIcon = ".ytp-bezel-icon",
  bezelTextWrapper = ".ytp-bezel-text-wrapper",
  bezelTextHide = ".ytp-bezel-text-hide",
  title = "title"
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
  } as ButtonTriggers,
  isAutoLike: false,
  autoLikeThreshold: 70
};

export const observerOptions: MutationObserverInit = { childList: true, subtree: true };

export function getIsElementVisible(element: HTMLElement): boolean {
  return element?.offsetWidth > 0 && element?.offsetHeight > 0;
}

export function getVisibleElement<T extends HTMLElement>(selector: string): T {
  const elements = [...document.querySelectorAll(selector)] as T[];
  return [...elements].find(getIsElementVisible);
}

export async function getElementByMutationObserver(selector: Selectors): Promise<HTMLElement> {
  return new Promise(resolve => {
    new MutationObserver((_, observer) => {
      const element = document.documentElement.querySelector<HTMLElement>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    }).observe(document, observerOptions);
  });
}
