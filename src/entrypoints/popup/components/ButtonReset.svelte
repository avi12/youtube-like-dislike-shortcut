<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { fade } from "svelte/transition";
  import IconReset from "@/entrypoints/popup/components/icons/IconReset.svelte";

  interface Props {
    disabled: boolean;
    onclick: MouseEventHandler<HTMLButtonElement>;
  }

  const { disabled, onclick }: Props = $props();
</script>

<button class="button-reset quick-transition" {disabled} in:fade={{ duration: 200 }} {onclick}>
  <IconReset {disabled} />
  Reset
</button>

<style>
  .button-reset {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0.65625rem 1rem;
    border: 1.5px solid var(--button-reset-border-color);
    border-radius: 32px;
    background-color: var(--button-reset-bg);
    color: var(--button-reset-color);
    font-size: 0.875rem;

    &:disabled {
      border: 1.5px solid var(--button-disabled-border-color);
      background-color: var(--button-disabled-bg);
      color: var(--button-disabled-color);
      cursor: not-allowed;
    }
  }
</style>
