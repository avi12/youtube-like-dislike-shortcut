<script lang="ts">
  import { storage } from "#imports";
  import { sharedState } from "./states.svelte";
  import { addNavigationListener, getVisibleElement, initial, SELECTORS } from "@/lib/utils-initials";
  import { getRatedButton } from "@/lib/ytr-buttons";
  import "./style.css";

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
    !sharedState.isRatedInitially &&
    (!sharedState.isAdInitiallyPlaying || !sharedState.isAdPlaying)
  );

  function getIsShorts() {
    return location.pathname.startsWith("/shorts");
  }

  function getIsLiveOrPremiere() {
    return Boolean(getVisibleElement(SELECTORS.liveBadge));
  }

  async function addTemporaryBodyListener() {
    if (lastTitle === document.title && lastUrl === location.href) {
      return;
    }

    lastTitle = document.title;
    lastUrl = location.href;
    isShorts = getIsShorts();
    isLiveOrPremiere = getIsLiveOrPremiere();
    sharedState.percentageWatched = 0;
    sharedState.lastTimeUpdate = 0;
    sharedState.isUserInteracted = false;
    window.ytrUserInteracted = false;
    sharedState.isRatedInitially = Boolean(getRatedButton());
  }

  function addStorageListener() {
    storage.watch<typeof initial.isAutoLike>("sync:isAutoLike", pIsAutoLike => {
      isAutoLikeEnabled = pIsAutoLike !== null ? pIsAutoLike : initial.isAutoLike;
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
    align-self: center !important;
    padding-inline-end: 8px !important;
    color: inherit !important;
  }
</style>
