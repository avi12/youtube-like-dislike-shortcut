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
    color: var(--button-cancel-color);
    background-color: var(--button-cancel-bg);
    border: 1.5px solid var(--button-cancel-border-color);
    padding: 0.65625rem 1rem;
    border-radius: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
  }
</style>
