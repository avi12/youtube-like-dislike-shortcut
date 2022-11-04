import {
  getRatedButton,
  getIsShorts,
  getRateButtons,
  rateVideo
} from "./content-script-youtube-rate-buttons";
import {
  getElementByMutationObserver,
  getVisibleElement,
  observerOptions,
  Selectors
} from "../utils-initials";

let gTitleLast = document.title;
let gUrlLast = location.href;

const gPlayerObserver = new MutationObserver((_, observer) => {
  const elVideo = getVisibleElement<HTMLVideoElement>(Selectors.video);
  if (!elVideo) {
    return;
  }
  stopTracking(elVideo);

  // Start the time counting only when the rating buttons loaded
  const [, elDislike] = getRateButtons();
  if (!elDislike) {
    return;
  }

  const isRated = Boolean(getRatedButton());
  if (isRated) {
    return;
  }

  observer.disconnect();

  elVideo.addEventListener(
    "canplay",
    () => {
      const isLiveOrPremiere = Boolean(getVisibleElement(Selectors.live));
      if (isLiveOrPremiere) {
        return;
      }

      gTimeCurrentLast = elVideo.currentTime;
      startTracking(elVideo);
    },
    { once: true }
  );
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

  const tempDelta = elVideo.currentTime - gTimeCurrentLast;
  // Only record normal playing to correctly assess the X% threshold
  if ((tempDelta > 0 && tempDelta < 1) || tempDelta < 0) {
    gTimeDelta = tempDelta;
  }
  gTimeCounter += gTimeDelta || 0;
  if (gTimeCounter < 0) {
    gTimeCounter = 0;
  }
  gTimeCurrentLast = elVideo.currentTime;

  // Counting the watch time regardless if the user has enabled the option or not,
  // so that if the user decides to enable during the video, the video will be auto-liked if passed the threshold
  window.ytrPercentageWatched = (gTimeCounter / elVideo.duration) * 100 || 0;
  if (!getIsShorts()) {
    setPercentageWatched({
      percentage: window.ytrPercentageWatched,
      isVisible: window.ytrAutoLikeEnabled
    });
  }

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
  const [elLike] = getRateButtons();
  const elContainer =
    elLike.closest(Selectors.toggleButtonsNormalVideoMY) ||
    elLike.closest(Selectors.toggleButtonsNormalVideo)?.parentElement;
  if (!elContainer) {
    return;
  }

  const createPercentageWatchedIndicator = (): HTMLElement => {
    const elPercentageWatched = document.createElement("div");
    elPercentageWatched.className = Selectors.percentageWatched.substring(1);
    elPercentageWatched.textContent = "0%";
    return elPercentageWatched;
  };

  const elIndicatorFound = elContainer.querySelector(Selectors.percentageWatched);
  const elIndicator = elIndicatorFound || createPercentageWatchedIndicator();
  if (!isVisible) {
    elIndicator.classList.add("hidden");
  } else {
    elIndicator.classList.remove("hidden");
  }
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

async function addGlobalEventListener(): Promise<void> {
  // Fires when navigating to another page
  const elTitle =
    document.documentElement.querySelector(Selectors.title) ||
    (await getElementByMutationObserver(Selectors.title));
  new MutationObserver(addTemporaryBodyListener).observe(elTitle, observerOptions);
}

export function prepareToAutoLike(): void {
  addGlobalEventListener();

  // Runs only on /watch & /shorts pages
  if (location.pathname.match(REGEX_SUPPORTED_PAGES)) {
    gPlayerObserver.observe(document, observerOptions);
  }
}

// Don't auto-like if rated by clicking
document.addEventListener("click", e => {
  if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
    return;
  }

  const elRatePressed = (<HTMLElement>e.target)
    .closest(Selectors.toggleButton)
    ?.querySelector("button[aria-pressed=true]");
  if (elRatePressed) {
    window.ytrUserInteracted = true;
  }
});
