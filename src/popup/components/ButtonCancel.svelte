<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import IconCancel from "~popup/components/icons/IconCancel.svelte";

  const dispatch = createEventDispatcher();
</script>

<button class="button-cancel quick-transition" in:fade={{ duration: 200 }} on:click={() => dispatch("click")}>
  <IconCancel />
  Cancel
</button>

<style lang="scss">
  .button-cancel {
    color: var(--button-cancel-color);
    background-color: var(--button-cancel-bg);
    border: 1.5px solid var(--button-cancel-border);
    padding: 0.65625rem 1rem;
    border-radius: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
  }
</style>
