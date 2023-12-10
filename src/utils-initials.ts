import { Storage } from "@plasmohq/storage";
import type { ButtonTriggers } from "~types";

export async function getStorage<T>({
  area,
  key,
  fallback,
  updateWindowKey
}: {
  area: "local" | "sync";
  key: string;
  fallback: T;
  updateWindowKey: string;
}): Promise<T> {
  const storage = new Storage({ area });
  let value: T;
  try {
    value = (await storage.get<T>(key)) ?? fallback;
  } catch {
    value = fallback;
  }
  if (typeof window[updateWindowKey] !== "object") {
    window[updateWindowKey] = value;
  } else {
    window[updateWindowKey] = { ...fallback, ...value };
  }
  return value;
}

export enum SELECTORS {
  video = "video",
  adSkipIn = ".ytp-ad-preview-text",
  adSkipNow = ".ytp-ad-skip-button-text",
  liveBadge = ".ytp-live-badge, .ytp-offline-slate-bar",
  percentageWatched = ".ytr-percentage",
  percentageContainer = "#top-level-buttons-computed",
  toggleButtonsNormalVideo = "#top-level-buttons-computed yt-smartimation, ytd-segmented-like-dislike-button-renderer yt-smartimation",
  toggleButtonsShortsVideo = "ytd-like-button-renderer",
  buttonSubscribe = "ytd-subscribe-button-renderer",
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
      primary: ["Equal"],
      modifiers: ["shiftKey"],
      secondary: true
    },
    dislike: {
      primary: ["Minus"],
      modifiers: ["shiftKey"],
      secondary: true
    },
    unrate: {
      primary: ["Digit0"],
      modifiers: ["shiftKey"],
      secondary: true
    }
  } as ButtonTriggers,
  isAutoLike: false,
  isAutoLikeSubscribedChannels: false,
  autoLikeThreshold: 70
};

export const REGEX_SUPPORTED_PAGES = /^\/(?:watch|shorts)/;
export const MODIFIER_KEYS = ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const;
export const MODIFIER_KEYCODES = ["Control", "Shift", "Alt", "Meta"];

export const OBSERVER_OPTIONS: MutationObserverInit = { childList: true, subtree: true };

export function getIsElementVisible(element: HTMLElement): boolean {
  return element?.offsetWidth > 0 && element?.offsetHeight > 0;
}

export function getVisibleElement<T extends HTMLElement>(selector: string): T {
  const elements = [...document.querySelectorAll(selector)] as T[];
  return [...elements].find(getIsElementVisible);
}

export async function getElementByMutationObserver<T extends HTMLElement>(selector: SELECTORS): Promise<T> {
  return new Promise(resolve => {
    new MutationObserver((_, observer) => {
      const element = document.documentElement.querySelector<HTMLElement>(selector);
      if (element) {
        observer.disconnect();
        resolve(element as T);
      }
    }).observe(document, OBSERVER_OPTIONS);
  });
}

export async function addNavigationListener(addTemporaryBodyListener: () => void) {
  const elTitle =
    document.documentElement.querySelector(SELECTORS.title) || (await getElementByMutationObserver(SELECTORS.title));
  new MutationObserver(addTemporaryBodyListener).observe(elTitle, OBSERVER_OPTIONS);
}

export function keyToModifier(key: string) {
  const keyToModifierMap = {
    shiftKey: "Shift",
    ctrlKey: "Ctrl",
    altKey: "Alt",
    metaKey: "Meta"
  };
  return keyToModifierMap[key] || key;
}

export function modifierToKey(modifier: string) {
  const modifierToKeyMap = {
    Shift: "shiftKey",
    Cmd: "metaKey",
    Ctrl: "ctrlKey",
    Alt: "altKey"
  };
  return modifierToKeyMap[modifier] || modifier;
}
