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
  <input bind:checked {disabled} hidden id="checkbox-{id}" type="checkbox" />
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
      gap: 8px;
      align-items: center;
      cursor: pointer;

      & .checkbox-custom {
        --transition-time: 0.2s;

        position: relative;
        width: 16px;
        height: 16px;
        border: 1px solid var(--checkbox-bg);
        border-radius: 2px;
        transition: border-color var(--transition-time) ease-in-out;

        &::before {
          transition: background-color var(--transition-time) ease-in-out;
        }
      }
    }

    & input[type="checkbox"] {
      &:checked + label .checkbox-custom {
        background-color: var(--card-bg);

        &::before {
          --padding: 2px;

          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: calc(100% - var(--padding) * 2);
          height: calc(100% - var(--padding) * 2);
          border-radius: 2px;
          background-color: var(--checkbox-bg);
          translate: -50% -50%;
        }
      }

      &:disabled + label {
        cursor: not-allowed;

        & .checkbox-custom {
          border: 1px solid var(--checkbox-bg-disabled);
          cursor: not-allowed;

          &::before {
            background-color: var(--checkbox-bg-disabled);
          }
        }
      }
    }
  }
</style>
