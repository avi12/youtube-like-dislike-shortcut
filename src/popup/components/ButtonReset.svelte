<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import IconReset from "~popup/components/icons/IconReset.svelte";

  const dispatch = createEventDispatcher();

  export let disabled: boolean;
</script>

<button class="button-reset quick-transition" {disabled} in:fade={{ duration: 200 }} on:click={() => dispatch("click")}>
  <IconReset {disabled} />Reset
</button>

<style lang="scss">
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
