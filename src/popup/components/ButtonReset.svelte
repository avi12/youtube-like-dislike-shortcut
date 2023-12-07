<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import IconReset from "~popup/components/icons/IconReset.svelte";

  const dispatch = createEventDispatcher();

  export let disabled: boolean;
</script>

<button class="button-reset quick-transition" {disabled} on:click={() => dispatch("click")}>
  <IconReset {disabled} />
  Reset
</button>

<style lang="scss">
  .button-reset {
    color: var(--button-reset-color);
    background-color: var(--button-reset-bg);
    border: var(--button-reset-border);
    padding: 10.5px 16px;
    border-radius: 32px;
    display: flex;
    align-items: center;
    gap: 4px;

    &:disabled {
      color: var(--button-disabled-color);
      background-color: var(--button-disabled-bg);
      border: var(--button-disabled-border);
      cursor: not-allowed;
    }
  }
</style>
