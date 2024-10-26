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
    color: var(--button-reset-color);
    background-color: var(--button-reset-bg);
    border: 1.5px solid var(--button-reset-border-color);
    padding: 0.65625rem 1rem;
    border-radius: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;

    &:disabled {
      color: var(--button-disabled-color);
      background-color: var(--button-disabled-bg);
      border: 1.5px solid var(--button-disabled-border-color);
      cursor: not-allowed;
    }
  }
</style>
