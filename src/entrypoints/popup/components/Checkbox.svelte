<script lang="ts">
  import type { Snippet } from "svelte";
  import { fade } from "svelte/transition";

  interface Props {
    checked: boolean;
    disabled: boolean;
    children?: Snippet;
  }

  let { checked = $bindable(), disabled, children }: Props = $props();
  const id = Math.random().toString(36).substring(7);
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

    & input[type="checkbox"] {
      &:checked + label .checkbox-custom {
        background-color: var(--card-bg);

        &::before {
          border-radius: 2px;
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          translate: -50% -50%;
          --padding: 2px;
          width: calc(100% - var(--padding) * 2);
          height: calc(100% - var(--padding) * 2);
          background-color: var(--checkbox-bg);
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

    & label {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;

      & .checkbox-custom {
        width: 16px;
        height: 16px;
        border: 1px solid var(--checkbox-bg);
        position: relative;
        border-radius: 2px;
        --transition-time: 0.2s;
        transition: border var(--transition-time) ease-in-out;

        &::before {
          transition: background-color var(--transition-time) ease-in-out;
        }
      }
    }
  }
</style>
