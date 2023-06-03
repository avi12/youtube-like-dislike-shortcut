import type { ButtonTriggers } from "~types";

export enum SELECTORS {
  video = "video",
  adSkipIn = ".ytp-ad-preview-text",
  adSkipNow = ".ytp-ad-skip-button-text",
  liveBadge = ".ytp-live-badge",
  toggleButtonsNormalVideo = "ytd-segmented-like-dislike-button-renderer yt-smartimation",
  toggleButtonsShortsVideo = "ytd-like-button-renderer",
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

export const OBSERVER_OPTIONS: MutationObserverInit = { childList: true, subtree: true };
export const REGEX_SUPPORTED_PAGES = /^\/(?:watch|shorts)/;

export function getIsShorts(): boolean {
  return location.pathname.startsWith("/shorts/");
}

export function getVisibleElement<T extends HTMLElement>(selector: string): T {
  const elements = [...document.querySelectorAll(selector)] as T[];
  return [...elements].find(getIsShorts() ? getIsInViewport : getIsPhisicallyOnViewport);
}
export async function getElementByMutationObserver(selector: SELECTORS): Promise<HTMLElement> {
  return new Promise(resolve => {
    new MutationObserver((_, observer) => {
      const element = document.documentElement.querySelector<HTMLElement>(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    }).observe(document, OBSERVER_OPTIONS);
  });
}

function getIsInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const isVisibleInViewport =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= document.documentElement.clientHeight &&
    rect.right <= document.documentElement.clientWidth;
  return getIsPhisicallyOnViewport(element) && isVisibleInViewport;
}

function getIsPhisicallyOnViewport(element: HTMLElement): boolean {
  return element.offsetWidth > 0 && element.offsetHeight > 0;
}

export function getContainerRateButtons(): HTMLDivElement {
  const { toggleButtonsNormalVideo, toggleButtonsShortsVideo } = SELECTORS;
  const elButtons = document.querySelectorAll(`${toggleButtonsNormalVideo}, ${toggleButtonsShortsVideo}`);
  const [elContainer] = [...elButtons].filter(getIsShorts() ? getIsInViewport : getIsPhisicallyOnViewport);
  return elContainer as HTMLDivElement;
}

export function getRateButtons(): HTMLButtonElement[] {
  const elContainerButtonsRate = getContainerRateButtons();
  if (!elContainerButtonsRate) {
    return [];
  }
  return [...elContainerButtonsRate.querySelectorAll("button")];
}

export function getRatedButton(): HTMLButtonElement {
  const [elLike] = getRateButtons();
  if (!elLike) {
    return null;
  }
  const elContainer = elLike.parentElement;
  return elContainer.querySelector("button[aria-pressed=true]");
}
