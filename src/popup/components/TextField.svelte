<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const random = Math.random();
  export let value;

  const dispatch = createEventDispatcher();

  function loadStyles(): void {
    // Manually injecting this CSS because lightningcss (https://github.com/parcel-bundler/lightningcss)
    // processes the :placeholder-shown as :-moz-placeholder-shown, a non-existent pseudo-class
    const elStyle = document.createElement("style");
    // language=CSS
    elStyle.textContent = `
      /*noinspection CssUnusedSymbol*/
      .form {
        position: relative;
        padding: 11px 0 0;
        flex: 1;
      }

      /*noinspection CssUnusedSymbol*/
      .form__field {
        font-family: inherit;
        width: 100%;
        border: 0;
        border-bottom: 2px solid #d2d2d2;
        outline: 0;
        font-size: 16px;
        /*noinspection CssUnresolvedCustomProperty*/
        color: var(--theme-text-primary);
        padding: 7px 0;
        background: transparent;
        transition: border-color 0.2s;
      }

      /*noinspection CssUnusedSymbol*/
      .form__field::placeholder {
        color: transparent;
      }

      /*noinspection CssUnusedSymbol*/
      .form__field:placeholder-shown ~ .form__label {
        font-size: 16px;
        cursor: text;
        top: 20px;
      }

      /*noinspection CssUnusedSymbol*/
      .form__label,
      .form__field:focus ~ .form__label {
        position: absolute;
        top: 0;
        display: block;
        transition: 0.2s;
        font-size: 12px;
        /*noinspection CssUnresolvedCustomProperty*/
        color: var(--theme-text-secondary);
      }

      /*noinspection CssUnusedSymbol*/
      .form__field:focus ~ .form__label {
        color: var(--slider-track-cover-color);
      }

      /*noinspection CssUnusedSymbol*/
      .form__field:focus {
        padding-bottom: 6px;
        border-bottom: 2px solid var(--slider-track-cover-color);
      }
    `;
    document.head.append(elStyle);
  }

  loadStyles();
</script>

<div class="container">
  <div class="form">
    <input
      bind:value
      class="form__field"
      id="text{random}"
      placeholder="_"
      type="text"
      on:input={({ currentTarget: { value: pValue } }) => {
        const inputValue = parseInt(pValue);

        const { min, max } = $$props;
        if (isNaN(inputValue) || inputValue < min) {
          value = min.toString();
        } else if (inputValue > max) {
          value = max.toString();
        } else {
          value = inputValue.toString();
        }

        dispatch("input", { value });
      }}
      {...$$restProps} />
    <label class="form__label" for="text{random}">
      <slot />
    </label>
  </div>
  <label class="primary-text" for="text{random}">
    <slot name="append" />
  </label>
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: baseline;
  }
</style>
