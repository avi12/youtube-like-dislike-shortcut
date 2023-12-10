<script lang="ts">
  import { isAutoLike } from "~popup/popup/sections/store-autolike";

  export let value = 60;
  export let disabled: boolean;

  $: {
    const num = value;
    if (num < 1) {
      value = 1;
    } else if (num > 99) {
      value = 99;
    }
  }</script>

<div class="textbox-wrapper" class:textbox-wrapper--disabled={!$isAutoLike}>
  <section class="text-wrapper">
    <input
      type="number"
      bind:value
      disabled={disabled || !$isAutoLike}
      on:keydown={e => {
        const number = value;
        const isIncrement = e.key === "ArrowUp";
        const isDecrement = e.key === "ArrowDown";
        if ((isIncrement && number >= 99) || (isDecrement && number <= 1)) {
          e.preventDefault();
        }
      }} />
  </section>
</div>

<style lang="scss">
  .textbox-wrapper {
    display: flex;
    align-items: center;
    color: var(--textbox-label-color);
    gap: 24px;

    &--disabled {
      color: var(--button-disabled-color);
    }
  }

  input[type="number"] {
    border-radius: 12px;
    border: 1.5px solid var(--textbox-border);
    color: var(--textbox-color);
    background-color: var(--textbox-bg);
    font-size: 0.875rem;
    padding: 14.5px 6px 14.5px 16px;
    width: 3.5rem;

    &:focus {
      outline: none;
    }

    &:disabled {
      color: var(--textbox-color-disabled);
      background-color: var(--textbox-bg-disabled);
      cursor: not-allowed;
    }
  }

  .text-wrapper {
    position: relative;
    display: inline-block;

    &::after {
      pointer-events: none;
      content: "%";
      color: var(--textbox-suffix-color);
      position: absolute;
      top: 50%;
      right: 0;
      translate: -150% -50%;
      width: 1rem;
    }
  }
</style>
