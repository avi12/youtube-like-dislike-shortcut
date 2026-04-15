<script lang="ts">
  import type { Snippet } from "svelte";
  import type { MouseEventHandler } from "svelte/elements";

  interface Props {
    active?: boolean;
    error?: boolean;
    disabled?: boolean;
    children?: Snippet;
    onclick: MouseEventHandler<HTMLButtonElement>;
  }

  const { active = false, error = false, disabled = false, children, onclick }: Props = $props();
</script>

<button class="button-shortcut quick-transition" class:active class:error {disabled} {onclick}>
  {@render children?.()}
</button>

<style>
  .button-shortcut {
    padding: 14.5px 16px;
    border: 1.5px solid var(--button-shortcut-border);
    border-radius: 12px;
    background-color: var(--button-shortcut-bg);
    color: var(--button-shortcut-color);
    box-shadow: var(--button-shortcut-shadow);

    &.active {
      border: 1.5px solid var(--button-shortcut-active-border-color);
      background-color: var(--button-shortcut-active-bg);
      color: var(--button-shortcut-active-color);
    }

    &:disabled {
      border: 1.5px solid var(--button-disabled-border-color);
      background-color: var(--button-disabled-bg);
      color: var(--button-disabled-color);
      cursor: not-allowed;
    }

    &.error {
      border: 1.5px solid var(--button-shortcut-error-border-color);
      background-color: var(--button-shortcut-error-bg);
      color: var(--button-shortcut-error-color);

      &:disabled {
        background-color: var(--button-shortcut-error-bg);
        color: var(--button-shortcut-error-color);
        filter: var(--button-shortcut-error-disabled-filter);
      }
    }
  }
</style>
