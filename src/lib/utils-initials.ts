import { type StorageArea } from "#imports";
import { type ButtonTriggers } from "@/lib/types";

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function mergeWithFallback(fallback: Record<string, unknown>, stored: Record<string, unknown>): Record<string, unknown> {
  const result = { ...fallback };
  for (const key in stored) {
    result[key] = isPlainObject(fallback[key]) && isPlainObject(stored[key])
      ? mergeWithFallback(fallback[key], stored[key])
      : stored[key];
  }
  return result;
}

export async function getStorage<K extends keyof typeof window>({
  area,
  key,
  fallback,
  updateWindowKey
}: {
  area: StorageArea;
  key: string;
  fallback: (typeof window)[K];
  updateWindowKey: K;
}) {
  let value: (typeof window)[K];
  try {
    value = await storage.getItem<(typeof window)[K]>(`${area}:${key}`, { fallback });
  } catch {
    value = fallback;
  }
  if (isPlainObject(value) && isPlainObject(fallback)) {
    Object.assign(value, mergeWithFallback(fallback, value));
  }
  window[updateWindowKey] = value;
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
  bezelTextWrapper = "ytd-page-manager .ytp-bezel-text-wrapper"
}

const buttonTriggers: ButtonTriggers = {
  like: { primary: ["Equal"], modifiers: ["shiftKey"], secondary: true },
  dislike: { primary: ["Minus"], modifiers: ["shiftKey"], secondary: true },
  unrate: { primary: ["Digit0"], modifiers: ["shiftKey"], secondary: true }
};

export const initial = {
  buttonTriggers,
  isAutoLike: false,
  isAutoLikeSubscribedChannels: false,
  autoLikeThreshold: 70
};

export const MODIFIER_KEYS = ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const;
export const MODIFIER_KEYCODES = ["Control", "Shift", "Alt", "Meta"] as const;

export function isModifier(key: string): key is typeof MODIFIER_KEYS[number] {
  return MODIFIER_KEYS.some(item => item === key);
}

export const OBSERVER_OPTIONS = Object.freeze<MutationObserverInit>({ childList: true, subtree: true });

function getIsElementVisible(element: HTMLElement) {
  return element?.offsetWidth > 0 && element?.offsetHeight > 0;
}

function getIsElementInViewport(element: HTMLElement) {
  const { top, left, bottom, right } = element.getBoundingClientRect();
  return top > 0 && left > 0 && bottom < innerHeight && right < innerWidth;
}

export function getVisibleElement<T extends HTMLElement>(selector: string) {
  const elements = [...document.querySelectorAll<T>(selector)];
  const isShorts = location.pathname.startsWith("/shorts");
  return [...elements].find(isShorts ? getIsElementInViewport : getIsElementVisible)!;
}

export async function getElementByMutationObserver<T extends HTMLElement>(selector: SELECTORS) {
  return new Promise<T>(resolve => {
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

const MODIFIER_KEY_DISPLAY = {
  shiftKey: "Shift",
  ctrlKey: "Ctrl",
  altKey: "Alt",
  metaKey: "Meta"
} as const;

export function keyToModifier(key: string) {
  return Object.entries(MODIFIER_KEY_DISPLAY).find(([entryKey]) => entryKey === key)?.[1] ?? key;
}

export function modifierToKey(modifier: string) {
  return Object.entries(MODIFIER_KEY_DISPLAY).find(([, display]) => display === modifier)?.[0] ?? modifier;
}
