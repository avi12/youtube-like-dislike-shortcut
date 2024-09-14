<script context="module" lang="ts">
  import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoMountShadowHost } from "plasmo";
  import { SELECTORS } from "~utils-initials";

  export const config: PlasmoCSConfig = {
    matches: ["https://www.youtube.com/*"]
  };

  export const mountShadowHost: PlasmoMountShadowHost = async ({ shadowHost, anchor, mountState }) => {
    shadowHost.className = SELECTORS.percentageWatched.substring(1);
    anchor.element.prepend(shadowHost);
    mountState.observer.disconnect();
  };

  export const getInlineAnchor: PlasmoGetInlineAnchor = () => getVisibleElement(SELECTORS.percentageContainer);
</script>

<script lang="ts">
  import { Storage } from "@plasmohq/storage";
  import { getRatedButton, rateVideo } from "~cs-helpers/cs-helper-ytr-buttons";
  import {
    addNavigationListener,
    getStorage,
    getVisibleElement,
    initial,
    OBSERVER_OPTIONS,
    REGEX_SUPPORTED_PAGES
  } from "~utils-initials";

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

  const storageSync = new Storage({ area: "sync" });

  Promise.all([
    storageSync.get<typeof initial.isAutoLike>("isAutoLike"),
    storageSync.get<typeof initial.autoLikeThreshold>("autoLikeThreshold")
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
    storageSync.watch({
      isAutoLike({ newValue: isAutoLike }: { newValue: typeof initial.isAutoLike }) {
        window.ytrAutoLikeEnabled = isAutoLike;
        isAutoLikeEnabled = isAutoLike;
      },
      autoLikeThreshold({ newValue: isAutoLike }: { newValue: typeof initial.autoLikeThreshold }) {
        window.ytrAutoLikeThreshold = isAutoLike;
        autoLikeThreshold = isAutoLike;
      }
    });
  }

  async function init() {
    window.ytrAutoLikeEnabled = await getStorage({
      area: "sync",
      key: "isAutoLike",
      updateWindowKey: "ytrAutoLikeEnabled",
      fallback: initial.isAutoLike
    });
    isAutoLikeEnabled = window.ytrAutoLikeEnabled;

    window.ytrAutoLikeThreshold = await getStorage({
      area: "sync",
      key: "autoLikeThreshold",
      updateWindowKey: "ytrAutoLikeThreshold",
      fallback: initial.autoLikeThreshold
    });
    autoLikeThreshold = window.ytrAutoLikeThreshold;

    addStorageListener();
    addNavigationListener(addTemporaryBodyListener);
    addVideoListener();
  }

  init();
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
    :global(.ytr-percentage) {
        align-self: center;
        padding-right: var(--yt-button-icon-padding, 8px);
        position: relative;
        bottom: 2px;
        font-size: var(--ytd-tab-system-font-size);
        font-weight: var(--ytd-tab-system-font-weight);
        letter-spacing: var(--ytd-tab-system-letter-spacing);
    }

    /* noinspection CssInvalidHtmlTagReference */
      :global([class*=YtSegmentedLikeDislikeButton] yt-smartimation, ytd-segmented-like-dislike-button-renderer yt-smartimation) {
          display: flex;
      }

    :global(html[dark="true"] .ytr-percentage) {
        color: var(--yt-spec-text-primary, white);
    }

    /* Un-setting the min-width of the element next to the action buttons*/
    /* so that the [ⵈ] button doesn't disappear when the percentage is injected*/
    :global(#top-row #owner) {
        min-width: max-content;
    }

</style>
