import { type ButtonTriggers, type Modifier } from "@/lib/types";

type StoredPrimitive = string | number | boolean | null;
type StoredValue = StoredPrimitive | StoredValue[] | StoredObject;
interface StoredObject {
  [key: string]: StoredValue;
}

function isPlainObject(value: StoredValue | undefined): value is StoredObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeWithFallback({ fallback, stored }: { fallback: StoredObject; stored: StoredObject }) {
  const result: StoredObject = { ...fallback };
  for (const [key, storedEntry] of Object.entries(stored)) {
    const fallbackEntry = fallback[key];
    const isMergeable = isPlainObject(fallbackEntry) && isPlainObject(storedEntry);
    result[key] = isMergeable
      ? mergeWithFallback({
          fallback: fallbackEntry,
          stored: storedEntry
        })
      : storedEntry;
  }
  return result;
}

export enum StorageKey {
  KEYBOARD_SHORTCUTS = "local:keyboardShortcuts",
  IS_AUTO_LIKE = "sync:isAutoLike",
  AUTO_LIKE_THRESHOLD = "sync:autoLikeThreshold",
  IS_AUTO_LIKE_SUBSCRIBED_CHANNELS = "sync:isAutoLikeSubscribedChannels",
  BUTTON_TRIGGERS = "local:buttonTriggers",
  THEME = "local:theme",
  WATCH_PROGRESS = "local:watchProgress",
  ENABLED_SURFACES = "sync:enabledSurfaces"
}

export async function getStorage<Key extends keyof typeof window>({
  storageKey,
  fallback,
  updateWindowKey
}: {
  storageKey: StorageKey;
  fallback: (typeof window)[Key];
  updateWindowKey: Key;
}) {
  let value: (typeof window)[Key];
  try {
    value = await storage.getItem<(typeof window)[Key]>(storageKey, { fallback });
  } catch {
    value = fallback;
  }
  const isMergeableObject = isPlainObject(value) && isPlainObject(fallback);
  if (isMergeableObject) {
    Object.assign(
      value,
      mergeWithFallback({
        fallback,
        stored: value
      })
    );
  }

  window[updateWindowKey] = value;
  return value;
}

export enum YoutubeHost {
  MUSIC = "music.youtube.com"
}

export enum SELECTORS {
  AD_OVERLAY = "ytd-player .ytp-ad-player-overlay-layout",
  LIVE_BADGE = "ytd-player .ytp-live-badge, ytd-player .ytp-offline-slate-bar",
  PERCENTAGE_CONTAINER = "ytd-watch-flexy:not([hidden]) #actions ytd-menu-renderer, reel-action-bar-view-model",
  PERCENTAGE_CONTAINER_FULLSCREEN = ".ytp-fullscreen-quick-actions like-button-view-model",
  TOGGLE_BUTTONS_NORMAL_VIDEO = "ytd-watch-flexy:not([hidden]) #top-level-buttons-computed yt-smartimation, ytd-page-manager ytd-segmented-like-dislike-button-renderer yt-smartimation",
  TOGGLE_BUTTONS_SHORTS_VIDEO = "reel-action-bar-view-model",
  TOGGLE_BUTTONS_MUSIC_VIDEO = "ytmusic-player-bar ytmusic-like-button-renderer, ytmusic-miniplayer segmented-like-dislike-button-view-model",
  TIME_INFO_MUSIC = ".ytMusicMiniPlayerTimeInfo",
  AD_SHOWING_MUSIC = "#movie_player.ad-showing",
  PROGRESS_BAR_MUSIC = "ytmusic-player-bar #progress-bar, ytmusic-miniplayer input.ytMusicMiniPlayerProgressBar",
  TRACK_LINK_MUSIC = "#movie_player a.ytp-title-link",
  LIKE_BUTTON = "like-button-view-model button, yt-button-shape.like button",
  DISLIKE_BUTTON = "dislike-button-view-model button, yt-button-shape.dislike button",
  BUTTON_SUBSCRIBE = "ytd-page-manager ytd-subscribe-button-renderer",
  BUTTON_FOLLOW_MUSIC = "ytmusic-subscribe-button-renderer",
  TITLE = "title",
  YTD_APP = "ytd-app",
  CHANNEL_TRAILER_PLAYER = "ytd-channel-video-player-renderer",
  MOVIE_PLAYER = "#movie_player"
}

export enum DomAttribute {
  ARIA_PRESSED = "aria-pressed",
  ARIA_VALUE_MAX = "aria-valuemax",
  MAX = "max",
  SUBSCRIBED = "subscribed"
}

export enum YoutubeEvent {
  NAVIGATE_FINISH = "yt-navigate-finish",
  VIDEO_DATA_CHANGE = "onVideoDataChange"
}

export enum UrlParam {
  VIDEO_ID = "v"
}

export enum YoutubePathname {
  WATCH = "/watch",
  EMBED = "/embed/",
  SHORTS = "/shorts/"
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

export enum Surface {
  YOUTUBE = "youtube",
  SHORTS = "shorts",
  MUSIC = "music"
}

export const initial = {
  enabledSurfaces: {
    [Surface.YOUTUBE]: true,
    [Surface.SHORTS]: true,
    [Surface.MUSIC]: true
  },
  buttonTriggers,
  isAutoLike: false,
  isAutoLikeSubscribedChannels: false,
  autoLikeThreshold: 70
};

export function getCurrentSurface() {
  if (location.hostname === YoutubeHost.MUSIC) {
    return Surface.MUSIC;
  }

  return location.pathname.startsWith(YoutubePathname.SHORTS) ? Surface.SHORTS : Surface.YOUTUBE;
}

const MODIFIER_KEYS = ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const;
export const MODIFIER_KEYCODES = ["Control", "Shift", "Alt", "Meta"] as const;

export function isModifier(key: string): key is (typeof MODIFIER_KEYS)[number] {
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
  const isShorts = getCurrentSurface() === Surface.SHORTS;
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
    document.documentElement.querySelector(SELECTORS.TITLE) || (await getElementByMutationObserver(SELECTORS.TITLE));
  new MutationObserver(addTemporaryBodyListener).observe(elTitle, OBSERVER_OPTIONS);
}

const MODIFIER_KEY_DISPLAY = [
  ["shiftKey", "Shift"],
  ["ctrlKey", "Ctrl"],
  ["altKey", "Alt"],
  ["metaKey", "Meta"]
] as const;

export function keyToModifier(key: string) {
  return MODIFIER_KEY_DISPLAY.find(([entryKey]) => entryKey === key)?.[1] ?? key;
}

export function modifierToKey(modifier: string) {
  return MODIFIER_KEY_DISPLAY.find(([, display]) => display === modifier)?.[0] ?? modifier;
}

export const ShortcutType = {
  LIKE: "like",
  DISLIKE: "dislike",
  UNRATE: "unrate"
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

function getSecondaryKeyFromPrimary({ modifiers, primary }: { modifiers: Modifier[]; primary: string[] }) {
  const formattedModifiers = modifiers.map(keyToModifier).join(" + ");
  const formattedPrimary = (formattedModifiers ? `${formattedModifiers} + ` : "") + primary.join(" + ");
  return defaultAdditionalShortcuts[formattedPrimary];
}

export function getActionPressed({ event, buttonTriggers }: { event: KeyboardEvent; buttonTriggers: ButtonTriggers }) {
  for (const actionName of Object.values(ShortcutType)) {
    const { primary, modifiers, secondary } = buttonTriggers[actionName];
    const isComboMatch = isComboPressed({
      modifiers,
      primary,
      event
    });
    if (isComboMatch) {
      return actionName;
    }

    const isSecondaryEnabled = secondary;
    if (isSecondaryEnabled) {
      const secondaryKey = getSecondaryKeyFromPrimary({
        primary,
        modifiers
      });
      const isSecondaryMatch = secondaryKey === event.code;
      if (isSecondaryMatch) {
        return actionName;
      }
    }
  }
  return null;
}
