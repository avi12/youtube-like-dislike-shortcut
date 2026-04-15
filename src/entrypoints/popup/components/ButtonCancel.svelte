<script lang="ts">
  import type { MouseEventHandler } from "svelte/elements";
  import { fade } from "svelte/transition";
  import IconCancel from "@/entrypoints/popup/components/icons/IconCancel.svelte";

  interface Props {
    onclick: MouseEventHandler<HTMLButtonElement>;
  }

  const { onclick }: Props = $props();
</script>

<button class="button-cancel quick-transition" in:fade={{ duration: 200 }} {onclick}>
  <IconCancel />
  Cancel
</button>

<style>
  .button-cancel {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 0.65625rem 1rem;
    border: 1.5px solid var(--button-cancel-border-color);
    border-radius: 32px;
    background-color: var(--button-cancel-bg);
    color: var(--button-cancel-color);
    font-size: 0.875rem;
  }
</style>
