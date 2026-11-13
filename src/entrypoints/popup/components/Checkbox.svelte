<script lang="ts">
  import type { Snippet } from "svelte";
  import { fade } from "svelte/transition";

  interface Props {
    checked: boolean;
    disabled: boolean;
    children?: Snippet;
  }

   
  let { checked = $bindable(), disabled, children }: Props = $props();
  const id = $props.id();
</script>

<div class="checkbox-container" transition:fade={{ duration: 200 }}>
  <input id="checkbox-{id}" class="visually-hidden" {disabled} type="checkbox" bind:checked />
  <label for="checkbox-{id}">
    <span class="checkbox-custom"></span>
    {@render children?.()}
  </label>
</div>

<style>
  .checkbox-container {
    position: relative;

    & label {
      display: flex;
      gap: 12px;
      align-items: center;
      font-size: 0.875rem;
      cursor: pointer;
    }

    & .checkbox-custom {
      display: grid;
      flex: none;
      place-items: center;
      width: 18px;
      height: 18px;
      border-radius: 2px;
      box-shadow: inset 0 0 0 2px var(--md-on-surface-variant);
      transition:
        background-color var(--md-spring-effects),
        box-shadow var(--md-spring-effects);

      &::after {
        content: "";
        width: 10px;
        height: 5px;
        border-bottom: 2px solid var(--md-on-primary);
        border-left: 2px solid var(--md-on-primary);
        opacity: 0;
        transition:
          opacity var(--md-spring-effects),
          scale var(--md-spring-spatial);
        rotate: -45deg;
        scale: 0.4;
        translate: 0 -1px;
      }
    }

    & input:checked + label .checkbox-custom {
      background-color: var(--md-primary);
      box-shadow: none;

      &::after {
        opacity: 1;
        scale: 1;
      }
    }

    & input:focus-visible + label .checkbox-custom {
      outline: 3px solid var(--md-primary);
      outline-offset: 2px;
    }

    & input:disabled + label {
      color: var(--md-disabled-content);
      cursor: not-allowed;

      & .checkbox-custom {
        box-shadow: inset 0 0 0 2px var(--md-disabled-content);
      }
    }

    & input:disabled:checked + label .checkbox-custom {
      background-color: var(--md-disabled-content);
      box-shadow: none;
    }
  }
</style>
