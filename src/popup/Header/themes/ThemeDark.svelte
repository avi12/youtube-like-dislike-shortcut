<script lang="ts">
  export let checked = false;
</script>

<svg
  class="theme-dark"
  class:checked
  fill="none"
  height="18"
  viewBox="0 0 18 18"
  width="18"
  xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8.99939 1.5C8.00483 2.49456 7.44609 3.84348 7.44609 5.25C7.44609 6.65652 8.00483 8.00544 8.99939 9C9.99395 9.99456 11.3429 10.5533 12.7494 10.5533C14.1559 10.5533 15.5048 9.99456 16.4994 9C16.4994 10.4834 16.0595 11.9334 15.2354 13.1668C14.4113 14.4001 13.24 15.3614 11.8695 15.9291C10.4991 16.4968 8.99107 16.6453 7.53622 16.3559C6.08136 16.0665 4.74499 15.3522 3.69609 14.3033C2.6472 13.2544 1.93289 11.918 1.6435 10.4632C1.35411 9.00832 1.50264 7.50032 2.0703 6.12987C2.63795 4.75943 3.59925 3.58809 4.83262 2.76398C6.06598 1.93987 7.51603 1.5 8.99939 1.5Z"
    fill="transparent"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.5" />
</svg>

<style lang="scss">
  .theme-dark {
    path {
      stroke: var(--theme-switcher-button-color-inactive);
    }

    &.checked {
      path {
        fill: var(--theme-switcher-button-color-active);
        stroke: var(--theme-switcher-button-color-active);
      }
    }
  }
</style>
