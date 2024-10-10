<script lang="ts">
  import { storage } from "wxt/storage";
  import {
    addNavigationListener,
    getStorage,
    getVisibleElement,
    initial,
    OBSERVER_OPTIONS,
    REGEX_SUPPORTED_PAGES,
    SELECTORS
  } from "@/lib/utils-initials";
  import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";

  let percentageWatched = 0;

  $: percentageDisplay = Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2
  }).format(percentageWatched / 100);

  let lastTitle = document.title;
  let lastUrl = location.href;
  let timeCounter = 0;
  let timeCurrentLast = 0;
  let timeDelta = 0;
  let isNormalVideo = getIsNormalVideo();
  let isAutoLikeEnabled = initial.isAutoLike;
  let autoLikeThreshold = initial.autoLikeThreshold;
  let isVideoRatedInitially = Boolean(getRatedButton());
  let isLiveOrPremiere = getIsLiveOrPremiere();

  function getIsNormalVideo() {
    return location.pathname === "/watch";
  }

  window.ytrAutoLikeThreshold = initial.autoLikeThreshold;
  window.ytrAutoLikeEnabled = initial.isAutoLike;

  Promise.all([
    storage.getItem<typeof initial.isAutoLike>("sync:isAutoLike", { fallback: initial.isAutoLike }),
    storage.getItem<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", { fallback: initial.autoLikeThreshold })
  ]).then(([isAutoLike, autoLikeThreshold]) => {
    window.ytrAutoLikeEnabled = isAutoLike;
    window.ytrAutoLikeThreshold = autoLikeThreshold;
  });

  $: if (isAutoLikeEnabled && percentageWatched >= autoLikeThreshold) {
    rateVideo(true);
  }

  function getIsLiveOrPremiere() {
    return Boolean(getVisibleElement(SELECTORS.liveBadge));
  }

  function autoLikeWhenNeeded(e: Event) {
    const elVideo = e.target as HTMLVideoElement;

    const isRated = Boolean(getRatedButton());
    isLiveOrPremiere = getIsLiveOrPremiere();
    if (window.ytrUserInteracted || isRated || isLiveOrPremiere) {
      stopTracking(elVideo);
      return;
    }

    const isAdPlaying = Boolean(document.querySelector(SELECTORS.adOverlay));
    if (isAdPlaying) {
      return;
    }

    const tempDelta = elVideo.currentTime - timeCurrentLast;
    // Only record normal playing to correctly assess the X% threshold
    if (tempDelta > 0 && tempDelta < 1) {
      timeDelta = tempDelta;
    }

    timeCounter += timeDelta || 0;
    if (timeCounter < 0) {
      timeCounter = 0;
    }
    timeCurrentLast = elVideo.currentTime;

    // Counting the watch time regardless if the user has enabled the option or not,
    // so that if the user decides to enable during the video, the video will be auto-liked
    // if passed the threshold
    percentageWatched = (timeCounter / elVideo.duration) * 100 || 0;
  }

  function startTracking(elVideo: HTMLVideoElement) {
    elVideo.addEventListener("timeupdate", autoLikeWhenNeeded);
  }

  function stopTracking(elVideo: HTMLVideoElement) {
    elVideo.removeEventListener("timeupdate", autoLikeWhenNeeded);
  }

  function addVideoListener() {
    new MutationObserver((_, observer) => {
      const elVideo = getVisibleElement<HTMLVideoElement>(SELECTORS.video);
      if (!elVideo) {
        return;
      }

      observer.disconnect();

      timeCurrentLast = elVideo.currentTime;
      startTracking(elVideo);
    }).observe(document, OBSERVER_OPTIONS);
  }

  async function addTemporaryBodyListener() {
    if (lastTitle === document.title && lastUrl === location.href) {
      return;
    }

    const isPageCompatible = location.pathname.match(REGEX_SUPPORTED_PAGES);
    if (!isPageCompatible) {
      return;
    }

    lastTitle = document.title;
    lastUrl = location.href;
    isNormalVideo = getIsNormalVideo();
    window.ytrUserInteracted = false;
    timeCounter = 0;
    isVideoRatedInitially = Boolean(getRatedButton());

    const isRenewTracking = !isVideoRatedInitially && !getIsLiveOrPremiere();
    if (isRenewTracking) {
      const elVideo = getVisibleElement<HTMLVideoElement>(SELECTORS.video);
      stopTracking(elVideo);
      startTracking(elVideo);
    }
  }

  function addStorageListener() {
    storage.watch<typeof initial.isAutoLike>("sync:isAutoLike", isAutoLike => {
      window.ytrAutoLikeEnabled = isAutoLike !== null ? isAutoLike : initial.isAutoLike;
    });
    storage.watch<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", autoLikeThreshold => {
      window.ytrAutoLikeThreshold = autoLikeThreshold || initial.autoLikeThreshold;
    });
  }

  Promise.all([
    getStorage({
      area: "sync",
      key: "isAutoLike",
      updateWindowKey: "ytrAutoLikeEnabled",
      fallback: initial.isAutoLike
    }),
    getStorage({
      area: "sync",
      key: "autoLikeThreshold",
      updateWindowKey: "ytrAutoLikeThreshold",
      fallback: initial.autoLikeThreshold
    })
  ]).then(([pIsAutoLike, pAutoLikeThreshold]) => {
    window.ytrAutoLikeEnabled = pIsAutoLike;
    window.ytrAutoLikeThreshold = pAutoLikeThreshold;

    isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    autoLikeThreshold = pAutoLikeThreshold;
  });

  addStorageListener();
  addNavigationListener(addTemporaryBodyListener);
  addVideoListener();
</script>

<svelte:body
  on:click={async e => {
    if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
      return;
    }

    const elRatePressed = e.target
      .closest(`${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`)
      ?.querySelector("button[aria-pressed=true]");
    if (elRatePressed) {
      window.ytrUserInteracted = true;
    }
  }} />

{#if process.env.NODE_ENV === "development" || (isNormalVideo && isAutoLikeEnabled && !isVideoRatedInitially && !isLiveOrPremiere)}
  {percentageDisplay}
{/if}

<style>
  :global(body) {
    margin: 0;
  }
</style>
