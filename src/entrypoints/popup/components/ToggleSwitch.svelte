<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    checked: boolean;
    disabled: boolean;
    children?: Snippet;
  }

  let { checked = $bindable(), disabled, children }: Props = $props();
  const id = Math.random().toString(36).substring(2);
</script>

<div class="toggle-switch">
  <input bind:checked {disabled} hidden id="switch-{id}" type="checkbox" />
  <label for="switch-{id}">
    {@render children?.()}
  </label>
</div>

<style>
  .toggle-switch {
    display: flex;
    align-items: center;
    position: relative;

    & label {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 0.875rem;
      color: var(--textbox-color-disabled);

      &:before {
        content: "";
        width: 50px;
        height: 28px;
        background-color: var(--switch-disabled-track-bg);
        box-shadow: var(--switch-disabled-track-bg-shadow);
        border-radius: 48px;
        transition: background-color 0.25s;
        padding: 4px;
      }

      &:after {
        content: "";
        position: absolute;
        top: 50%;
        left: 4px;
        width: 24px;
        height: 24px;
        translate: 0 -50%;
        border-radius: 50%;
        background-color: var(--switch-disabled-thumb-bg);
        box-shadow: var(--switch-disabled-thumb-shadow);
        transition:
          translate 0.25s,
          background-color 0.25s;
      }
    }

    & input[type="checkbox"] {
      &:checked + label {
        color: var(--color-text);

        &:before {
          background-color: var(--switch-track-bg);
          box-shadow: var(--switch-track-bg-shadow);
        }

        &:after {
          translate: 26px -50%;
          background-color: var(--switch-thumb-bg);
          box-shadow: var(--switch-thumb-shadow);
        }
      }

      &:disabled + label {
        color: var(--textbox-color-disabled);
        cursor: not-allowed;

        &:before {
          background-color: var(--switch-disabled-track-bg);
          box-shadow: var(--switch-disabled-track-bg-shadow);
          cursor: not-allowed;
        }

        &:after {
          background-color: var(--switch-disabled-thumb-bg);
          box-shadow: var(--switch-disabled-thumb-shadow);
          cursor: not-allowed;
        }
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.theme-auto) label::after {
      transition: none;
    }
  }
</style>
