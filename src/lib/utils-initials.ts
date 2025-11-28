import { type StorageArea } from "#imports";
import { type ButtonTriggers } from "@/lib/types";

export async function getStorage<T>({
  area,
  key,
  fallback,
  updateWindowKey
}: {
  area: StorageArea;
  key: string;
  fallback: T;
  updateWindowKey: string;
}): Promise<T> {
  let value: T;
  try {
    value = await storage.getItem<T>(`${area}:${key}`, { fallback });
  } catch {
    value = fallback;
  }
  // @ts-expect-error Incompatible types
  if (typeof window[updateWindowKey] !== "object") {
    // @ts-expect-error Incompatible types
    window[updateWindowKey] = value;
  } else {
    // @ts-expect-error Incompatible types
    window[updateWindowKey] = { ...fallback, ...value };
  }
  return value;
}

export enum SELECTORS {
  adOverlay = "ytd-player .ytp-ad-player-overlay-layout",
  liveBadge = "ytd-player .ytp-live-badge, ytd-player .ytp-offline-slate-bar",
  percentageContainer = "ytd-watch-flexy:not([hidden]) #actions ytd-menu-renderer, reel-action-bar-view-model",
  toggleButtonsNormalVideo = "ytd-watch-flexy:not([hidden]) #top-level-buttons-computed yt-smartimation, ytd-page-manager ytd-segmented-like-dislike-button-renderer yt-smartimation",
  toggleButtonsShortsVideo = "reel-action-bar-view-model",
  buttonSubscribe = "ytd-page-manager ytd-subscribe-button-renderer",
  title = "title",
  // Bezel classes
  bezel = "ytd-page-manager .ytp-bezel",
  bezelIcon = "ytd-page-manager .ytp-bezel-icon",
  bezelTextWrapper = "ytd-page-manager .ytp-bezel-text-wrapper",
  bezelTextHide = "ytd-page-manager .ytp-bezel-text-hide"
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

export const REGEX_SUPPORTED_PAGES = /^\/(?:watch|shorts|live)/;
export const MODIFIER_KEYS = ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const;
export const MODIFIER_KEYCODES = ["Control", "Shift", "Alt", "Meta"] as const;

export const OBSERVER_OPTIONS: MutationObserverInit = { childList: true, subtree: true };

function getIsElementVisible(element: HTMLElement): boolean {
  return element?.offsetWidth > 0 && element?.offsetHeight > 0;
}

function getIsElementInViewport(element: HTMLElement): boolean {
  const { top, left, bottom, right } = element.getBoundingClientRect();
  return top > 0 && left > 0 && bottom < innerHeight && right < innerWidth;
}

export function getVisibleElement<T extends HTMLElement>(selector: string): T {
  const elements = [...document.querySelectorAll<T>(selector)];
  // Removed debug log per user request
  const isNormalVideo = location.pathname.startsWith("/watch");
  // Removed debug log per user request
  return [...elements].find(isNormalVideo ? getIsElementVisible : getIsElementInViewport)!;
}

export async function getElementByMutationObserver<T extends HTMLElement>(selector: SELECTORS): Promise<T> {
  return new Promise(resolve => {
    new MutationObserver((_, observer) => {
      const element = document.documentElement.querySelector<T>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
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
  // @ts-expect-error Handled correctly
  return keyToModifierMap[key] || key;
}

export function modifierToKey(modifier: string) {
  const modifierToKeyMap = {
    Shift: "shiftKey",
    Cmd: "metaKey",
    Ctrl: "ctrlKey",
    Alt: "altKey"
  };
  // @ts-expect-error Handled correctly
  return modifierToKeyMap[modifier] || modifier;
}
