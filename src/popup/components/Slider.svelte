<script lang="ts">
  import noUiSlider, { API } from "nouislider";
  import { createEventDispatcher, onMount } from "svelte";

  import { initial } from "~utils-initials";

  export let value = initial.autoLikeThreshold;
  let initialValue;

  let elSlider: HTMLDivElement;
  const dispatch = createEventDispatcher();

  let slider: API;

  onMount(() => {
    slider = noUiSlider.create(elSlider, {
      start: value,
      connect: "lower",
      format: {
        from: () => value,
        to: i => Math.floor(i)
      },
      range: {
        min: $$restProps.min,
        max: $$restProps.max
      },
      step: 1
    });
    slider.on("update", (values: number[]) => {
      value = values[0];
      initialValue = value;
      dispatch("update", { value: values });
    });
    return () => slider.destroy();
  });

  $: if (slider) {
    if (value !== initialValue) {
      slider.set(value, false);
    }
    slider.updateOptions({ start: value }, false);
  }
</script>

<div class="slider">
  <div class="slider__label">
    <slot name="prepend-outer" />
  </div>
  <!--  prettier-ignore -->
  <div bind:this={elSlider} class="slider-element"></div>
</div>

<style global lang="scss">
  @use "./variables";
  @use "nouislider/dist/nouislider.css";

  .slider {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;

    .slider-element.slider-element {
      translate: 0 -5px;
      flex: 1;
      height: 2px;
      position: relative;
      background: var(--slider-track-uncover-color);
      // Overrides for noUiSlider
      border: none;
      box-shadow: none;

      .noUi-connect {
        background: var(--slider-track-cover-color);
      }

      .noUi-handle {
        cursor: pointer;
        width: 16px;
        height: 16px;
        top: -7px;
        right: -8px;
        border-radius: 50%;
        background: var(--slider-track-cover-color);

        // Overrides for noUiSlider
        border: none;
        box-shadow: none;

        // Overrides for noUiSlider
        &::before,
        &::after {
          content: unset;
        }
      }
    }

    &__label {
      width: 130px;
    }
  }
</style>
