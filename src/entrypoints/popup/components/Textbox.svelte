<script lang="ts">
  interface Props {
    isAutoLike: boolean;
    value?: number;
    disabled: boolean;
  }

  let { isAutoLike, value = $bindable(60), disabled }: Props = $props();

  $effect(() => {
    const isBelowMin = value < 1;
    const isAboveMax = value > 99;
    if (isBelowMin) {
      value = 1;
    } else if (isAboveMax) {
      value = 99;
    }
  });
</script>

<div class="textbox-wrapper">
  <section class="text-wrapper">
    <input
      aria-label="Auto-like threshold in percent"
      disabled={disabled || !isAutoLike}
      onkeydown={e => {
        const number = value;
        const isIncrement = e.key === "ArrowUp";
        const isDecrement = e.key === "ArrowDown";
        const isAtUpperBound = isIncrement && number >= 99;
        const isAtLowerBound = isDecrement && number <= 1;
        if (isAtUpperBound || isAtLowerBound) {
          e.preventDefault();
        }
      }}
      type="number"
      bind:value />
  </section>
</div>

<style>
  .textbox-wrapper {
    display: flex;
    align-items: center;
  }

  input[type="number"] {
    box-sizing: border-box;
    width: 5.5rem;
    min-height: 40px;
    padding: 8px 32px 8px 16px;
    border: none;
    border-radius: var(--md-shape-small);
    background-color: transparent;
    color: var(--md-on-surface);
    font: inherit;
    font-size: 1rem;
    box-shadow: inset 0 0 0 1px var(--md-outline);

    &:disabled {
      color: var(--md-disabled-content);
      box-shadow: inset 0 0 0 1px var(--md-disabled-container);
      cursor: not-allowed;
    }

    &:hover:enabled {
      box-shadow: inset 0 0 0 1px var(--md-on-surface);
    }

    &:focus:enabled {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--md-primary);
    }
  }

  .text-wrapper {
    position: relative;
    display: inline-block;

    &::after {
      content: "%";
      position: absolute;
      top: 50%;
      right: 12px;
      color: var(--md-on-surface-variant);
      pointer-events: none;
      translate: 0 -50%;
    }
  }
</style>
