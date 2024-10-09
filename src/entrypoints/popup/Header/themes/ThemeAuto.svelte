<script lang="ts">
  export let checked = false;
</script>

<svg class="theme-auto" class:checked height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="10" fill="transparent" r="9" stroke="#798191" stroke-width="2"></circle>
  <mask fill="white" id="path-2-inside-1_316_2">
    <path
      d="M 17.125 16.996 C 19 15.121 20.054 12.577 20.054 9.925 C 20.054 7.273 19 4.729 17.125 2.854 C 15.25 0.979 12.706 -0.075 10.054 -0.075 C 7.402 -0.075 4.858 0.979 2.983 2.854 L 10.054 9.925 L 17.125 16.996 Z"
    ></path>
  </mask>
  <path
    d="M 17.125 16.996 C 19 15.12 20.054 12.577 20.054 9.925 C 20.054 7.273 19 4.729 17.125 2.854 C 15.25 0.978 12.706 -0.075 10.054 -0.075 C 7.402 -0.075 4.858 0.978 2.983 2.854 L 10.054 9.925 L 17.125 16.996 Z"
    fill="#798191"
    mask="url(#path-2-inside-1_316_2)"
    stroke="#798191"
    stroke-width="4"></path>
</svg>

<style>
  .theme-auto {
    & path {
      stroke: var(--theme-switcher-button-color-inactive);
    }

    &.checked {
      & path[mask] {
        stroke: var(--theme-switcher-button-color-active);
        fill: var(--theme-switcher-button-color-active);
      }

      & circle {
        stroke: var(--theme-switcher-button-color-active);
      }
    }
  }
</style>
