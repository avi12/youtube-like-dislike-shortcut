<script lang="ts">
  import { storage } from "#imports";
  import { sharedState } from "./states.svelte";
  import { addNavigationListener, getVisibleElement, initial, SELECTORS } from "@/lib/utils-initials";
  import { StorageKey } from "@/lib/utils-initials";

  interface Props {
    isAutoLikeEnabled: boolean;
  }

  let { isAutoLikeEnabled }: Props = $props();

  const percentageDisplay = $derived(
    Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2
    }).format(sharedState.percentageWatched / 100)
  );

  let lastTitle = document.title;
  let lastUrl = location.href;
  let isShorts = $state(getIsShorts());
  let isLiveOrPremiere = $state(getIsLiveOrPremiere());

  const isDisplayPercentage = $derived(
    !isShorts &&
    isAutoLikeEnabled &&
    !isLiveOrPremiere &&
    sharedState.isRatingResolved &&
    !sharedState.isRatedInitially &&
    (!sharedState.isAdInitiallyPlaying || !sharedState.isAdPlaying)
  );

  function getIsShorts() {
    return location.pathname.startsWith("/shorts");
  }

  function getIsLiveOrPremiere() {
    return Boolean(getVisibleElement(SELECTORS.liveBadge));
  }

  function addTemporaryBodyListener() {
    if (lastTitle === document.title && lastUrl === location.href) {
      return;
    }
    lastTitle = document.title;
    lastUrl = location.href;
    isShorts = getIsShorts();
    isLiveOrPremiere = getIsLiveOrPremiere();
  }

  function addStorageListener() {
    storage.watch<typeof initial.isAutoLike>(StorageKey.isAutoLike, isAutoLike => {
      isAutoLikeEnabled = isAutoLike !== null ? isAutoLike : initial.isAutoLike;
    });
  }

  addStorageListener();
  addNavigationListener(addTemporaryBodyListener);
</script>

{#if isDisplayPercentage}
  {percentageDisplay}
{/if}

<style>
  :host {
    color: inherit !important;
  }

  :global(body) {
    padding-bottom: 5px;
    font-family: Roboto, sans-serif;
    font-weight: 700;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
</style>
