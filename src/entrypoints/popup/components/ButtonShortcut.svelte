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

<button class="md-button button-shortcut" class:active class:error {disabled} {onclick}>
  {@render children?.()}
</button>

<style>
  .button-shortcut {
    justify-content: center;
    min-inline-size: 10rem;
    min-height: 40px;
    padding-inline: 24px;
    border-radius: var(--md-shape-large);
    font-size: 1rem;

    &.active {
      --md-button-bg: var(--md-primary);
      --md-button-color: var(--md-on-primary);

      border-radius: var(--md-shape-full);
    }

    &.error {
      --md-button-bg: var(--md-error);
      --md-button-color: var(--md-on-error);

      &:disabled {
        background-color: var(--md-error-container);
        color: var(--md-on-error-container);
      }
    }
  }
</style>
