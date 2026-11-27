<script lang="ts">
  import { sharedState } from "./states.svelte";

  const percentageDisplay = $derived(
    Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2
    }).format(sharedState.percentageWatched / 100)
  );
</script>

{percentageDisplay}

<style>
  :host {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    color: unset !important;
    font-family: var(--yt-ref-typography-values--font-family, Roboto, Arial, sans-serif) !important;
    font-weight: 700 !important;
    font-size: 1.4rem !important;
    font-variant-numeric: tabular-nums !important;
    white-space: nowrap !important;
  }

  :host(ytr-percentage-music[data-append="after"]) {
    margin-left: 6px !important;
  }

  :host(ytr-percentage-music[data-append="before"]) {
    margin-right: 6px !important;
  }

  :host(ytr-percentage) {
    display: block !important;
    align-self: flex-start !important;
    margin-right: 6px !important;
    line-height: 40px !important;
  }
</style>
