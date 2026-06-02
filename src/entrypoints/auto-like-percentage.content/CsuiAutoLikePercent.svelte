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
    color: inherit !important;
    display: inline-flex !important;
    align-items: center !important;
  }

  :host(ytr-percentage-music) {
    margin-left: 6px !important;
  }

  :host(ytr-percentage) {
    margin-right: 6px !important;
  }

  :global(body) {
    font-family: Roboto, sans-serif;
    font-weight: 700;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  :host(ytr-percentage-music) :global(body) {
    font-size: 12px;
  }
</style>
