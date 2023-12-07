<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import IconCancel from "~popup/components/icons/IconCancel.svelte";

  const dispatch = createEventDispatcher();
</script>

<button class="button-cancel quick-transition" on:click={() => dispatch("click")}>
  <IconCancel />
  Cancel
</button>

<style lang="scss">
  .button-cancel {
    color: var(--button-cancel-color);
    background-color: var(--button-cancel-bg);
    border: var(--button-cancel-border);
    padding: 10.5px 16px;
    border-radius: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
