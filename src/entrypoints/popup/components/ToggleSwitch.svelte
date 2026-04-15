<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    checked: boolean;
    disabled: boolean;
    children?: Snippet;
  }

   
  let { checked = $bindable(), disabled, children }: Props = $props();
  const id = $props.id();
</script>

<div class="toggle-switch">
  <input bind:checked {disabled} hidden id="switch-{id}" type="checkbox" />
  <label for="switch-{id}">
    {@render children?.()}
  </label>
</div>

<style>
  .toggle-switch {
    position: relative;
    display: flex;
    align-items: center;

    & label {
      display: flex;
      gap: 16px;
      align-items: center;
      color: var(--textbox-color-disabled);
      font-size: 0.875rem;
      cursor: pointer;

      &::before {
        content: "";
        width: 50px;
        height: 28px;
        padding: 4px;
        border-radius: 48px;
        background-color: var(--switch-disabled-track-bg);
        box-shadow: var(--switch-disabled-track-bg-shadow);
        transition: background-color 0.25s;
      }

      &::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 4px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: var(--switch-disabled-thumb-bg);
        box-shadow: var(--switch-disabled-thumb-shadow);
        transition:
          translate 0.25s,
          background-color 0.25s;
        translate: 0 -50%;
      }
    }

    & input[type="checkbox"] {
      &:checked + label {
        color: var(--color-text);

        &::before {
          background-color: var(--switch-track-bg);
          box-shadow: var(--switch-track-bg-shadow);
        }

        &::after {
          background-color: var(--switch-thumb-bg);
          box-shadow: var(--switch-thumb-shadow);
          translate: 26px -50%;
        }
      }

      &:disabled + label {
        color: var(--textbox-color-disabled);
        cursor: not-allowed;

        &::before {
          background-color: var(--switch-disabled-track-bg);
          box-shadow: var(--switch-disabled-track-bg-shadow);
          cursor: not-allowed;
        }

        &::after {
          background-color: var(--switch-disabled-thumb-bg);
          box-shadow: var(--switch-disabled-thumb-shadow);
          cursor: not-allowed;
        }
      }
    }
  }
</style>
