import { storage, type StorageArea } from "wxt/storage";
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
    value = getValue(await storage.getItem<T>(`${area}:${key}`, { fallback }));
  } catch {
    value = fallback;
  }
  // @ts-ignore
  if (typeof window[updateWindowKey] !== "object") {
    // @ts-ignore
    window[updateWindowKey] = value;
  } else {
    // @ts-ignore
    window[updateWindowKey] = { ...fallback, ...value };
  }
  return value;
}

export function getValue(value: any) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export enum SELECTORS {
  video = "video",
  adOverlay = ".ytp-ad-player-overlay",
  liveBadge = ".ytp-live-badge, .ytp-offline-slate-bar",
  percentageContainer = "#actions ytd-menu-renderer, #actions #like-button",
  toggleButtonsNormalVideo = "#top-level-buttons-computed yt-smartimation, ytd-segmented-like-dislike-button-renderer yt-smartimation",
  toggleButtonsShortsVideo = "ytd-like-button-renderer",
  buttonSubscribe = "ytd-subscribe-button-renderer",
  title = "title",
  // Bezel classes
  bezel = ".ytp-bezel",
  bezelIcon = ".ytp-bezel-icon",
  bezelTextWrapper = ".ytp-bezel-text-wrapper",
  bezelTextHide = ".ytp-bezel-text-hide"
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
export const MODIFIER_KEYCODES = ["Control", "Shift", "Alt", "Meta"] as const;

export const OBSERVER_OPTIONS: MutationObserverInit = { childList: true, subtree: true };

function getIsElementVisible(element: HTMLElement): boolean {
  return element?.offsetWidth > 0 && element?.offsetHeight > 0;
}

function getIsElementInViewport(element: HTMLElement): boolean {
  const { bottom, left, right, top } = element.getBoundingClientRect();
  return top > 0 && left > 0 && bottom < innerHeight && right < innerWidth;
}

export function getVisibleElement<T extends HTMLElement>(selector: string): T {
  const elements = [...document.querySelectorAll(selector)] as T[];
  const isNormalVideo = location.pathname.startsWith("/watch");
  return [...elements].find(isNormalVideo ? getIsElementVisible : getIsElementInViewport)!;
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
  // @ts-ignore
  return keyToModifierMap[key] || key;
}

export function modifierToKey(modifier: string) {
  const modifierToKeyMap = {
    Shift: "shiftKey",
    Cmd: "metaKey",
    Ctrl: "ctrlKey",
    Alt: "altKey"
  };
  // @ts-ignore
  return modifierToKeyMap[modifier] || modifier;
}
