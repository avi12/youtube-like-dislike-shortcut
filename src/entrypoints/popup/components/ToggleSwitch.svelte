<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ChangeEventHandler } from "svelte/elements";

  interface Props {
    checked: boolean;
    disabled: boolean;
    children?: Snippet;
    onchange?: ChangeEventHandler<HTMLInputElement>;
  }

  let { checked = $bindable(), disabled, children, onchange }: Props = $props();
</script>

<label class="toggle-switch">
  <input {disabled} {onchange} role="switch" type="checkbox" bind:checked />
  {@render children?.()}
</label>

<style>
  .toggle-switch {
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 0.875rem;
    cursor: pointer;

    &:has(:disabled) {
      color: var(--md-disabled-content);
      cursor: not-allowed;
    }
  }

  input {
    --track-width: 52px;
    --track-height: 32px;
    --thumb-size: 24px;
    --thumb-inset: 4px;
    --thumb-scale-off: 0.6667;
    --thumb-scale-pressed: 1.1667;
    --thumb-travel: calc(var(--track-width) - var(--thumb-size) - var(--thumb-inset) * 2);

    appearance: none;
    position: relative;
    flex: none;
    block-size: var(--track-height);
    inline-size: var(--track-width);
    margin: 0;
    border-radius: var(--md-shape-full);
    background-color: var(--md-surface-container-high);
    box-shadow: inset 0 0 0 2px var(--md-outline);
    cursor: inherit;
    transition: background-color var(--md-spring-effects);

    &::before {
      content: "";
      position: absolute;
      inset-block-start: 50%;
      inset-inline-start: var(--thumb-inset);
      block-size: var(--thumb-size);
      inline-size: var(--thumb-size);
      border-radius: var(--md-shape-full);
      background-color: var(--md-outline);
      transition:
        translate var(--md-spring-spatial),
        scale var(--md-spring-spatial),
        background-color var(--md-spring-effects);
      scale: var(--thumb-scale-off);
      translate: 0 -50%;
    }

    &:checked {
      background-color: var(--md-primary);
      box-shadow: none;
    }

    &:checked::before {
      background-color: var(--md-on-primary);
      scale: 1;
      translate: var(--thumb-travel) -50%;
    }

    &:active::before {
      scale: var(--thumb-scale-pressed);
    }

    &:focus-visible {
      outline: 3px solid var(--md-primary);
      outline-offset: 2px;
    }

    &:disabled {
      background-color: var(--md-disabled-container);
      box-shadow: inset 0 0 0 2px var(--md-disabled-content);
    }

    &:disabled::before {
      background-color: var(--md-disabled-content);
    }

    &:disabled:checked {
      box-shadow: none;
    }
  }
</style>
