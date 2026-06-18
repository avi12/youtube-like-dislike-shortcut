import { type ButtonTriggers, type Modifier } from "@/lib/types";

type StoredPrimitive = string | number | boolean | null;
type StoredValue = StoredPrimitive | StoredValue[] | StoredObject;
interface StoredObject {
  [key: string]: StoredValue;
}

function isPlainObject(value: StoredValue): value is StoredObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeWithFallback(fallback: StoredObject, stored: StoredObject) {
  const result: StoredObject = { ...fallback };
  for (const key in stored) {
    const fallbackEntry = fallback[key];
    const storedEntry = stored[key];
    result[key] = isPlainObject(fallbackEntry) && isPlainObject(storedEntry)
      ? mergeWithFallback(fallbackEntry, storedEntry)
      : storedEntry;
  }
  return result;
}

export enum StorageKey {
  keyboardShortcuts = "local:keyboardShortcuts",
  isAutoLike = "sync:isAutoLike",
  autoLikeThreshold = "sync:autoLikeThreshold",
  isAutoLikeSubscribedChannels = "sync:isAutoLikeSubscribedChannels",
  buttonTriggers = "local:buttonTriggers",
  theme = "local:theme"
}

export async function getStorage<K extends keyof typeof window>({
  storageKey,
  fallback,
  updateWindowKey
}: {
  storageKey: StorageKey;
  fallback: (typeof window)[K];
  updateWindowKey: K;
}) {
  let value: (typeof window)[K];
  try {
    value = await storage.getItem<(typeof window)[K]>(storageKey, { fallback });
  } catch {
    value = fallback;
  }
  const isMergeableObject = isPlainObject(value) && isPlainObject(fallback);
  if (isMergeableObject) {
    Object.assign(value, mergeWithFallback(fallback, value));
  }
  window[updateWindowKey] = value;
  return value;
}

export enum YOUTUBE_HOST {
  music = "music.youtube.com"
}

export enum SELECTORS {
  adOverlay = "ytd-player .ytp-ad-player-overlay-layout",
  liveBadge = "ytd-player .ytp-live-badge, ytd-player .ytp-offline-slate-bar",
  percentageContainer = "ytd-watch-flexy:not([hidden]) #actions ytd-menu-renderer, reel-action-bar-view-model",
  percentageContainerFullscreen = ".ytp-fullscreen-quick-actions like-button-view-model",
  toggleButtonsNormalVideo = "ytd-watch-flexy:not([hidden]) #top-level-buttons-computed yt-smartimation, ytd-page-manager ytd-segmented-like-dislike-button-renderer yt-smartimation",
  toggleButtonsShortsVideo = "reel-action-bar-view-model",
  toggleButtonsMusicVideo = "ytmusic-like-button-renderer",
  likeButton = "like-button-view-model button, yt-button-shape.like button",
  dislikeButton = "dislike-button-view-model button, yt-button-shape.dislike button",
  buttonSubscribe = "ytd-page-manager ytd-subscribe-button-renderer",
  buttonFollowMusic = "ytmusic-subscribe-button-renderer",
  title = "title",
  ytdApp = "ytd-app",
  channelTrailerPlayer = "ytd-channel-video-player-renderer",
  moviePlayer = "#movie_player"
}

export enum DOM_ATTRIBUTE {
  ariaPressed = "aria-pressed",
  subscribed = "subscribed"
}

export enum YOUTUBE_EVENT {
  navigateFinish = "yt-navigate-finish"
}

export enum YOUTUBE_PATHNAME {
  watch = "/watch",
  embed = "/embed/",
  shorts = "/shorts/"
}

const buttonTriggers: ButtonTriggers = {
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
};

export const initial = {
  buttonTriggers,
  isAutoLike: false,
  isAutoLikeSubscribedChannels: false,
  autoLikeThreshold: 70
};

const MODIFIER_KEYS = ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const;
export const MODIFIER_KEYCODES = ["Control", "Shift", "Alt", "Meta"] as const;

export function isModifier(key: string): key is typeof MODIFIER_KEYS[number] {
  return MODIFIER_KEYS.some(item => item === key);
}

export const OBSERVER_OPTIONS = Object.freeze<MutationObserverInit>({
  childList: true,
  subtree: true 
});

function getIsElementVisible(elElement: HTMLElement) {
  const { offsetWidth, offsetHeight } = elElement;
  return offsetWidth > 0 && offsetHeight > 0;
}

function getIsElementInViewport(elElement: HTMLElement) {
  const { top, left, bottom, right } = elElement.getBoundingClientRect();
  return top > 0 && left > 0 && bottom < innerHeight && right < innerWidth;
}

export function getVisibleElement<T extends HTMLElement>(selector: string) {
  const elements = document.querySelectorAll<T>(selector);
  const isShorts = location.pathname.startsWith(YOUTUBE_PATHNAME.shorts);
  return elements.values().find(isShorts ? getIsElementInViewport : getIsElementVisible);
}

export async function getElementByMutationObserver<T extends HTMLElement>(selector: SELECTORS) {
  return new Promise<T>(resolve => {
    new MutationObserver((_, observer) => {
      const element = document.documentElement.querySelector<T>(selector);
      const isElementFound = element !== null;
      if (isElementFound) {
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

export const ShortcutType = {
  like: "like",
  dislike: "dislike",
  unrate: "unrate"
} as const;
export type ShortcutType = (typeof ShortcutType)[keyof typeof ShortcutType];

export const defaultAdditionalShortcuts: Record<string, string | undefined> = {
  "Shift + Equal": "NumpadAdd",
  "Shift + Minus": "NumpadSubtract",
  "Shift + Digit8": "NumpadMultiply",
  "Shift + Slash": "NumpadDivide",
  "Shift + Period": "NumpadDecimal"
};

function isComboPressed({
  modifiers,
  primary,
  event
}: {
  modifiers: Modifier[];
  primary: string[];
  event: KeyboardEvent;
}) {
  const isPrimaryPressed = primary.includes(event.code);
  if (!isPrimaryPressed) {
    return false;
  }
  return modifiers.every(modifier => event[modifier]);
}

function getSecondaryKeyFromPrimary({
  modifiers,
  primary
}: {
  modifiers: Modifier[];
  primary: string[];
}) {
  const formattedModifiers = modifiers.map(keyToModifier).join(" + ");
  const formattedPrimary = (formattedModifiers ? `${formattedModifiers} + ` : "") + primary.join(" + ");
  return defaultAdditionalShortcuts[formattedPrimary];
}

export function getActionPressed(event: KeyboardEvent, buttonTriggers: ButtonTriggers) {
  for (const actionName of Object.values(ShortcutType)) {
    const { primary, modifiers, secondary } = buttonTriggers[actionName];
    const isComboMatch = isComboPressed({ modifiers, primary, event });
    if (isComboMatch) {
      return actionName;
    }
    const isSecondaryEnabled = secondary;
    if (isSecondaryEnabled) {
      const secondaryKey = getSecondaryKeyFromPrimary({ primary, modifiers });
      const isSecondaryMatch = secondaryKey === event.code;
      if (isSecondaryMatch) {
        return actionName;
      }
    }
  }
  return null;
}
