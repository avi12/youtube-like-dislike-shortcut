<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { fade } from "svelte/transition";

  interface Props {
    onclick: MouseEventHandler<HTMLButtonElement>;
  }

  const { onclick }: Props = $props();
</script>

<button class="md-button button-cancel" in:fade={{ duration: 200 }} {onclick}>
  <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L4 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
    <path d="M4 4L12 12" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
  </svg>
  Cancel
</button>

<style>
  .button-cancel {
    --md-button-bg: var(--md-primary-container);
    --md-button-color: var(--md-on-primary-container);

    padding-inline: 16px;
  }
</style>
