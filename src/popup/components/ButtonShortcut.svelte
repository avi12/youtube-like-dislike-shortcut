<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let active = false;
  export let error = false;
  export let disabled = false;
</script>

<button
  class="button-shortcut quick-transition"
  class:button-shortcut--active={active}
  class:button-shortcut--error={error}
  {disabled}
  on:click={() => dispatch("click")}>
  <slot />
</button>

<style lang="scss">
  .button-shortcut {
    color: var(--button-shortcut-color);
    background-color: var(--button-shortcut-bg);
    border: 1.5px solid var(--button-shortcut-border);
    box-shadow: var(--button-shortcut-shadow);
    padding: 14.5px 16px;
    border-radius: 12px;

    &--active {
      color: var(--button-shortcut-active-color);
      background-color: var(--button-shortcut-active-bg);
      border: 1.5px solid var(--button-shortcut-active-border);
    }

    &:disabled {
      color: var(--button-disabled-color);
      background-color: var(--button-disabled-bg);
      border: 1.5px solid var(--button-disabled-border);
      cursor: not-allowed;
    }

    &--error {
      color: var(--button-shortcut-error-color);
      background-color: var(--button-shortcut-error-bg);
      border: 1.5px solid var(--button-shortcut-error-border);

      &:disabled {
        color: var(--button-shortcut-error-color);
        background-color: var(--button-shortcut-error-bg);
      }
    }
  }

  :global([data-theme="dark"]) {
    .button-shortcut {
      &--error:disabled {
        filter: brightness(0.8);
      }
    }
  }
</style>
