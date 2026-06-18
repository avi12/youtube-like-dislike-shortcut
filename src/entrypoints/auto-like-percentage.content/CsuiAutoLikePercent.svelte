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
  }

  :host(ytr-percentage-music) {
    margin-left: 6px !important;
  }

  :host(ytr-percentage) {
    display: block !important;
    align-self: flex-start !important;
    margin-right: 6px !important;
    line-height: 40px !important;
  }

  :global(body) {
    margin: 0;
    font-family: Roboto, sans-serif;
    font-weight: 700;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
