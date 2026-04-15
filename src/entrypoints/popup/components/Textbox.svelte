<script lang="ts">
  interface Props {
    isAutoLike: boolean;
    value?: number;
    disabled: boolean;
  }

  let { isAutoLike, value = $bindable(60), disabled }: Props = $props();

  $effect(() => {
    if (value < 1) {
      value = 1;
    } else if (value > 99) {
      value = 99;
    }
  });
</script>

<div class="textbox-wrapper" class:disabled={!isAutoLike}>
  <section class="text-wrapper">
    <input
      bind:value
      disabled={disabled || !isAutoLike}
      onkeydown={e => {
        const number = value;
        const isIncrement = e.key === "ArrowUp";
        const isDecrement = e.key === "ArrowDown";
        if ((isIncrement && number >= 99) || (isDecrement && number <= 1)) {
          e.preventDefault();
        }
      }}
      type="number" />
  </section>
</div>

<style>
  .textbox-wrapper {
    display: flex;
    gap: 24px;
    align-items: center;
    color: var(--textbox-label-color);

    &.disabled {
      color: var(--button-disabled-color);
    }
  }

  input[type="number"] {
    width: 3.5rem;
    padding: 14.5px 6px 14.5px 16px;
    border: 1.5px solid var(--textbox-border);
    border-radius: 12px;
    background-color: var(--textbox-bg);
    color: var(--textbox-color);
    font-size: 0.875rem;

    &:focus {
      outline: none;
    }

    &:disabled {
      background-color: var(--textbox-bg-disabled);
      color: var(--textbox-color-disabled);
      cursor: not-allowed;
    }
  }

  .text-wrapper {
    position: relative;
    display: inline-block;

    &::after {
      content: "%";
      position: absolute;
      top: 50%;
      right: 0;
      width: 1rem;
      color: var(--textbox-suffix-color);
      pointer-events: none;
      translate: -150% -50%;
    }
  }
</style>
