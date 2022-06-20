import { getActiveButton, rateVideo } from "./content-script-youtube-rate-buttons";
import { getVisibleElement, Selectors } from "../utils-initials";

const observerOptions: MutationObserverInit = { childList: true, subtree: true };
let gTitleLast = document.title;
let gPlayerObserver: MutationObserver;
let gTimeCounter = 0;
let gTimeDelta: number;
let gTimeCurrentLast: number;
const REGEX_SUPPORTED_PAGES = /^\/(?:watch|shorts)/;

function getIsLive(): HTMLElement {
  return getVisibleElement(Selectors.live);
}

function startTracking(elVideo: HTMLVideoElement): void {
  elVideo.addEventListener("timeupdate", autoLikeWhenNeeded);
}

function stopTracking(elVideo: HTMLVideoElement): void {
  elVideo.removeEventListener("timeupdate", autoLikeWhenNeeded);
}

export function getIsPassedThreshold(): boolean {
  return window.ytrPercentageWatched >= window.ytrAutoLikeThreshold;
}

function autoLikeWhenNeeded(e: Event): void {
  const elVideo = <HTMLVideoElement>e.target;
  window.ytrUserInteracted = window.ytrUserInteracted || Boolean(getActiveButton());
  if (window.ytrUserInteracted) {
    stopTracking(elVideo);
    return;
  }

  const isAdPlaying = document.querySelector(`${Selectors.adSkipIn}, ${Selectors.adSkipNow}`);
  if (isAdPlaying) {
    return;
  }

  const tempDelta = Math.abs(elVideo.currentTime - gTimeCurrentLast);
  // Only record normal playing to correctly assess the X% threshold
  if (tempDelta > 0 && tempDelta < 1) {
    gTimeDelta = tempDelta;
  }
  gTimeCounter += isNaN(gTimeDelta) ? 0 : gTimeDelta;
  gTimeCurrentLast = elVideo.currentTime;

  // Counting the watch time regardless if the user has enabled the option or not,
  // so that if the user decides to enable during the video, the video will be auto-liked if passed the threshold
  window.ytrPercentageWatched = (gTimeCounter / elVideo.duration) * 100;
  setPercentageWatched({
    percentage: window.ytrPercentageWatched,
    isVisible: window.ytrAutoLikeEnabled
  });

  if (!window.ytrAutoLikeEnabled) {
    return;
  }

  if (getIsPassedThreshold()) {
    stopTracking(elVideo);
    rateVideo(true);
  }
}

export function setPercentageWatched({
  percentage,
  isVisible
}: {
  percentage: number;
  isVisible: boolean;
}): void {
  const { parentElement: elContainer } = getVisibleElement(Selectors.toggleButtonsNormalVideo);
  if (!elContainer) {
    return;
  }

  const elIndicatorFound = elContainer.querySelector(Selectors.percentageWatched);
  const elIndicator = elIndicatorFound || document.createElement("ytd-toggle-button-renderer");

  const classNames = [Selectors.percentageWatched.substring(1), !isVisible ? "hidden" : ""];
  elIndicator.className = classNames.join(" ");
  elIndicator.innerHTML = `${percentage.toFixed(2)}%`;

  if (!elIndicatorFound) {
    elContainer.prepend(elIndicator);
  }
}

function addTemporaryBodyListener(): void {
  // For some reason, the title observer will run as soon as .observer() calls,
  // so we need to prevent it
  if (gTitleLast === document.title) {
    return;
  }

  // Runs only on /watch & /shorts pages where the user has not rated, nor it is a livestream
  if (!location.pathname.match(REGEX_SUPPORTED_PAGES) || getActiveButton() || getIsLive()) {
    return;
  }

  gTitleLast = document.title;
  window.ytrUserInteracted = false;
  gTimeCounter = 0;

  if (!gPlayerObserver) {
    gPlayerObserver = new MutationObserver(() => {
      const elVideo = getVisibleElement<HTMLVideoElement>(Selectors.video);
      if (!elVideo) {
        return;
      }

      gPlayerObserver.disconnect();
      gTimeCurrentLast = elVideo.currentTime;
      stopTracking(elVideo);
      startTracking(elVideo);
    });
  }

  gPlayerObserver.observe(document, observerOptions);
}

function addGlobalEventListenerOnDesktop(): void {
  // Fires when navigating to another page
  new MutationObserver(addTemporaryBodyListener).observe(document.querySelector("title"), observerOptions);
}

export function prepareToAutoLike(): void {
  addGlobalEventListenerOnDesktop();

  // Runs only on /watch & /shorts pages where the user has not rated, nor it is a livestream
  new MutationObserver((_, observer) => {
    if (!location.pathname.match(REGEX_SUPPORTED_PAGES) || getActiveButton() || getIsLive()) {
      observer.disconnect();
      return;
    }

    const elVideo = getVisibleElement<HTMLVideoElement>(Selectors.video);
    if (elVideo) {
      gTimeCurrentLast = elVideo.currentTime;
      observer.disconnect();
      startTracking(elVideo);
    }
  }).observe(document, observerOptions);
}
