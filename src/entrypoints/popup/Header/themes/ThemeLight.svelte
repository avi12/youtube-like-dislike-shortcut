<script lang="ts">
  interface Props {
    checked?: boolean;
  }

  const { checked = false }: Props = $props();
</script>

<svg
  class="theme-light"
  class:checked
  fill="none"
  height="20"
  viewBox="0 0 22 20"
  width="22"
  xmlns="http://www.w3.org/2000/svg">
  <path
    class="sun-fill"
    d="M10.9966 13.3333C12.8804 13.3333 14.4075 11.8409 14.4075 10C14.4075 8.15905 12.8804 6.66666 10.9966 6.66666C9.11284 6.66666 7.58575 8.15905 7.58575 10C7.58575 11.8409 9.11284 13.3333 10.9966 13.3333Z"
    fill="transparent"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M10.9966 1.66666V3.33333"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M10.9966 16.6667V18.3333"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M4.9679 4.10833L6.17022 5.28333"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M15.8229 14.7167L17.0253 15.8917"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M2.46942 10H4.17485"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M17.8183 10H19.5237"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M6.17022 14.7167L4.9679 15.8917"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
  <path
    d="M17.0253 4.10833L15.8229 5.28333"
    stroke="#1B1B1B"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="1.46667" />
</svg>

<style>
  .theme-light {
    & path {
      stroke: var(--theme-switcher-button-color-inactive);
    }

    &.checked {
      & path {
        stroke: var(--theme-switcher-button-color-active);

        &.sun-fill {
          fill: var(--theme-switcher-button-color-active);
        }
      }
    }
  }
</style>
