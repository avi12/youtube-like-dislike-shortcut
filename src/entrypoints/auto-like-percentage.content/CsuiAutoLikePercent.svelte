<script lang="ts">
  import { storage } from "#imports";
  import { sharedState } from "./states.svelte";
  import {
    addNavigationListener,
    getVisibleElement,
    initial,
    REGEX_SUPPORTED_PAGES,
    SELECTORS
  } from "@/lib/utils-initials";
  import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";

  interface Props {
    isAutoLikeEnabled: boolean;
    autoLikeThreshold: number
  }

  let { isAutoLikeEnabled, autoLikeThreshold }: Props = $props();

  const percentageDisplay = $derived(
    Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2
    }).format(sharedState.percentageWatched / 100)
  );

  let lastTitle = document.title;
  let lastUrl = location.href;
  let isNormalVideo = $state(getIsNormalVideo());
  let isLiveOrPremiere = $state(getIsLiveOrPremiere());

  const isDisplayPercentage = $derived(
    isNormalVideo &&
    isAutoLikeEnabled &&
    !isLiveOrPremiere &&
    !sharedState.isRatedInitially &&
    (!sharedState.isAdInitiallyPlaying || !sharedState.isAdPlaying)
  );

  const isRateVideo = $derived(
    sharedState.percentageWatched >= autoLikeThreshold &&
    isAutoLikeEnabled &&
    !isLiveOrPremiere &&
    !sharedState.isUserInteracted &&
    !sharedState.isRatedInitially &&
    !sharedState.isAdPlaying
  );

  function getIsNormalVideo() {
    return location.pathname === "/watch";
  }

  $effect(() => {
    if (isRateVideo) {
      rateVideo(true);
    }
  });

  function getIsLiveOrPremiere() {
    return Boolean(getVisibleElement(SELECTORS.liveBadge));
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
    isLiveOrPremiere = getIsLiveOrPremiere();
    sharedState.percentageWatched = 0;
    sharedState.isUserInteracted = false;
    window.ytrUserInteracted = false;
    sharedState.isRatedInitially = Boolean(getRatedButton());
  }

  function addStorageListener() {
    storage.watch<typeof initial.isAutoLike>("sync:isAutoLike", pIsAutoLike => {
      isAutoLikeEnabled = pIsAutoLike !== null ? pIsAutoLike : initial.isAutoLike;
    });
    storage.watch<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", pAutoLikeThreshold => {
      autoLikeThreshold = pAutoLikeThreshold || initial.autoLikeThreshold;
    });
  }

  addStorageListener();
  addNavigationListener(addTemporaryBodyListener);
</script>

{#if isDisplayPercentage}
  {percentageDisplay}
{/if}

<style>
  :global {
    body {
      margin: 0;
      color: var(--yt-spec-text-primary);
      font: var(--ytd-tab-system-font-weight) var(--ytd-tab-system-font-size) Roboto, Arial, sans-serif;
    }

    html {
      padding-right: var(--yt-button-icon-padding, 8px);
      position: relative;
      top: calc(25% - 1px);
      letter-spacing: var(--ytd-tab-system-letter-spacing);
    }
  }
</style>
