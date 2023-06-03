<script lang="ts">
  import { Storage } from "@plasmohq/storage";

  import { rateVideo } from "~cs-helpers/content-script-youtube-rate-buttons";
  import { REGEX_SUPPORTED_PAGES, SELECTORS, getIsShorts, initial, getVisibleElement } from "~utils-initials";

  const getIsAdPlaying = (): boolean =>
    Boolean(document.querySelector(`${SELECTORS.adSkipIn}, ${SELECTORS.adSkipNow}`));

  export let isAutoLike = initial.isAutoLike;
  export let autoLikeThreshold = initial.autoLikeThreshold;

  const elVideo = getVisibleElement<HTMLVideoElement>(SELECTORS.video);
  let timeCurrentLast = elVideo.currentTime;

  let percentageWatched = 0;
  let timeDelta: number;
  let timeCounter = 0;

  const storageSync = new Storage({ area: "sync" });

  export function stopTracking(): void {
    elVideo.removeEventListener("timeupdate", autoLikeWhenNeeded);
  }

  export function startTracking(): void {
    timeCurrentLast = elVideo.currentTime;
    timeCounter = 0;
    elVideo.addEventListener("timeupdate", autoLikeWhenNeeded);
  }

  function autoLikeWhenNeeded(): void {
    if (window.ytrUserInteracted) {
      stopTracking();
      return;
    }

    if (getIsAdPlaying()) {
      return;
    }

    const tempDelta = elVideo.currentTime - timeCurrentLast;
    if ((tempDelta > 0 && tempDelta < 1) || tempDelta < 0) {
      timeDelta = tempDelta;
    }
    timeCounter += timeDelta || 0;
    if (timeCounter < 0) {
      timeCounter = 0;
    }
    timeCurrentLast = elVideo.currentTime;

    // Counting the watch time regardless if the user has enabled the option or not,
    // so that if the user decides to enable during the video, the video will be auto-liked if passed the threshold
    percentageWatched = (timeCounter / elVideo.duration) * 100 || 0;
  }

  $: isVisible = !getIsShorts() && isAutoLike;

  $: percentageDisplayed = new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(percentageWatched / 100);

  $: if (percentageWatched >= autoLikeThreshold && isAutoLike) {
    stopTracking();
    rateVideo(true);
  }

  function addStorageListener(): void {
    storageSync.watch({
      isAutoLike({ newValue: pIsAutoLike }: { newValue: boolean }) {
        isAutoLike = pIsAutoLike;
      },
      autoLikeThreshold({ newValue: pAutoLikeThreshold }: { newValue: number }) {
        autoLikeThreshold = pAutoLikeThreshold;
      }
    });
  }

  function addManualRateListener(): void {
    // Don't auto-like if rated by clicking
    document.addEventListener("click", e => {
      if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
        return;
      }

      const elRatePressed = (e.target as HTMLElement)
        .closest(`${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`)
        ?.querySelector("button[aria-pressed=true]");
      if (elRatePressed) {
        window.ytrUserInteracted = true;
        stopTracking();
      }
    });
  }

  function init(): void {
    addManualRateListener();
    addStorageListener();
  }

  init();
</script>

{#if isVisible}
  {percentageDisplayed}
{/if}
