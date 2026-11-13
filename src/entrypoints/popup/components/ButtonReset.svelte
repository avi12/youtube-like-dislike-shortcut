<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { fade } from "svelte/transition";

  interface Props {
    disabled: boolean;
    onclick: MouseEventHandler<HTMLButtonElement>;
  }

  const { disabled, onclick }: Props = $props();
</script>

<button class="md-button button-reset" {disabled} {onclick} in:fade={{ duration: 200 }}>
  <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2.2 10.6C2.95558 11.6074 4.00898 12.3516 5.21099 12.7271C6.41301 13.1026 7.70269 13.0903 8.89737 12.6921C10.092 12.2939 11.1311 11.5299 11.8675 10.5083C12.6038 9.48667 13 8.2593 13 7C13 5.56783 12.4311 4.19432 11.4184 3.18162C10.4057 2.16893 9.03217 1.6 7.6 1.6C6.004 1.6 4.552 2.248 3.508 3.292L1 5.8M1 5.8V1M1 5.8H5.8"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2" />
  </svg>
  Reset
</button>

<style>
  .button-reset {
    --md-button-bg: transparent;
    --md-button-color: var(--md-primary);

    min-height: 32px;
    padding-inline: 16px;
    box-shadow: inset 0 0 0 1px var(--md-outline);

    &:disabled {
      background-color: transparent;
      box-shadow: inset 0 0 0 1px var(--md-disabled-container);
    }
  }
</style>
