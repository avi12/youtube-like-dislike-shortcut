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
  <input bind:checked {disabled} {onchange} role="switch" type="checkbox" />
  <span class="track"></span>
  <span class="label">{@render children?.()}</span>
</label>

<style>
  .toggle-switch {
    --track-width: 52px;
    --track-height: 32px;
    --thumb-size: 24px;
    --thumb-scale-off: 0.6667;
    --thumb-scale-pressed: 1.1667;
    --thumb-inset: 4px;
    --thumb-travel: 20px;

    position: relative;
    display: flex;
    gap: 16px;
    align-items: center;
    font-size: 0.875rem;
    cursor: pointer;

    &:has(input:disabled) {
      color: var(--md-disabled-content);
      cursor: not-allowed;
    }
  }

  input {
    position: absolute;
    block-size: var(--track-height);
    inline-size: var(--track-width);
    margin: 0;
    opacity: 0%;
    cursor: inherit;
  }

  .track {
    position: relative;
    flex: none;
    block-size: var(--track-height);
    inline-size: var(--track-width);
    border-radius: var(--md-shape-full);
    background-color: var(--md-surface-container-high);
    box-shadow: inset 0 0 0 2px var(--md-outline);

    &::after {
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
  }

  input:checked + .track {
    background-color: var(--md-primary);
    box-shadow: none;

    &::after {
      block-size: var(--thumb-size-on);
      inline-size: var(--thumb-size-on);
      background-color: var(--md-on-primary);
      translate: calc(var(--track-width) - var(--thumb-size-on) - var(--thumb-inset) - 4px) -50%;
    }
  }

  input:focus-visible + .track {
    outline: 3px solid var(--md-primary);
    outline-offset: 2px;
  }

  .toggle-switch:active input:enabled + .track::after {
    scale: var(--thumb-scale-pressed);
  }

  input:disabled + .track {
    background-color: var(--md-disabled-container);
    box-shadow: inset 0 0 0 2px var(--md-disabled-content);

    &::after {
      background-color: var(--md-disabled-content);
    }
  }

  input:disabled:checked + .track {
    box-shadow: none;
  }
</style>
