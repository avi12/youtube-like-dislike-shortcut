import { getActiveButton, getRateButtons, rateVideo } from "./content-script-youtube-rate-buttons";
import { getIsElementVisible, getVisibleElement, Selectors } from "../utils-initials";

const observerOptions: MutationObserverInit = { childList: true, subtree: true };
let gTitleLast = document.title;
let gUrlLast = location.href;

const gPlayerObserver = new MutationObserver((_, observer) => {
  const elVideo = getVisibleElement<HTMLVideoElement>(Selectors.video);
  const elLiveBadge = document.querySelector<HTMLDivElement>(Selectors.live);
  const [elLike] = getRateButtons();
  if (!elVideo || !elLike || !elLiveBadge) {
    return;
  }

  observer.disconnect();

  const isRated = getActiveButton();
  const isLiveOrPremiere = getIsElementVisible(elLiveBadge);
  if (isRated || isLiveOrPremiere) {
    return;
  }

  gTimeCurrentLast = elVideo.currentTime;
  stopTracking(elVideo);
  startTracking(elVideo);
});

let gTimeCounter = 0;
let gTimeDelta: number;
let gTimeCurrentLast: number;
const REGEX_SUPPORTED_PAGES = /^\/(?:watch|shorts)/;

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
  const { percentageWatched, toggleButtonsNormalVideo } = Selectors;
  const container = getVisibleElement(`${toggleButtonsNormalVideo}:not(${percentageWatched})`);
  const { parentElement: elContainer } = container;
  if (!elContainer) {
    return;
  }

  const elIndicatorFound = elContainer.querySelector(percentageWatched);
  const elIndicator = elIndicatorFound || document.createElement("ytd-toggle-button-renderer");

  const classNames = [percentageWatched.substring(1), !isVisible ? "hidden" : ""];
  elIndicator.className = classNames.join(" ");
  elIndicator.textContent = `${percentage.toFixed(2)}%`;

  if (!elIndicatorFound) {
    elContainer.prepend(elIndicator);
  }
}

function addTemporaryBodyListener(): void {
  if (gTitleLast === document.title || gUrlLast === location.href) {
    return;
  }

  // Runs only on /watch & /shorts pages
  if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
    return;
  }

  gTitleLast = document.title;
  gUrlLast = location.href;
  window.ytrUserInteracted = false;
  gTimeCounter = 0;

  gPlayerObserver.observe(document, observerOptions);
}

function addGlobalEventListenerOnDesktop(): void {
  // Fires when navigating to another page
  new MutationObserver(addTemporaryBodyListener).observe(document.querySelector("title"), observerOptions);
}

export function prepareToAutoLike(): void {
  addGlobalEventListenerOnDesktop();

  // Runs only on /watch & /shorts pages
  if (location.pathname.match(REGEX_SUPPORTED_PAGES)) {
    gPlayerObserver.observe(document, observerOptions);
  }
}
