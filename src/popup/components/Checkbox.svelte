<script lang="ts">
  export let checked: boolean;
  export let disabled: boolean;
  const id = Math.random().toString(36).substring(7);
</script>

<div class="checkbox-container">
  <input
    bind:checked
    {disabled}
    hidden
    id="checkbox-{id}"
    type="checkbox" />
  <label for="checkbox-{id}">
    <span class="checkbox-custom"></span>
    <slot />
  </label>
</div>

<style lang="scss">
  .checkbox-container {
    position: relative;

    input[type="checkbox"] {
      &:checked + label .checkbox-custom {
        background-color: var(--card-bg);

        &::before {
          border-radius: 2px;
          content: "";
          position: absolute;
          display: block;
          top: 50%;
          left: 50%;
          translate: -50% -50%;
          $padding: 2px;
          width: calc(100% - #{$padding} * 2);
          height: calc(100% - #{$padding} * 2);
          background-color: var(--checkbox-bg);
        }
      }

      &:disabled + label {
        cursor: not-allowed;

        .checkbox-custom {
          border: 1px solid var(--checkbox-bg-disabled);
          cursor: not-allowed;

          &::before {
            background-color: var(--checkbox-bg-disabled);
          }
        }
      }
    }

    label {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;

      .checkbox-custom {
        width: 16px;
        height: 16px;
        border: 1px solid var(--checkbox-bg);
        display: inline-block;
        position: relative;
        border-radius: 2px;
        transition: border 0.02s ease-in-out;

        &::before {
          transition: background-color 0.02s ease-in-out;
        }
      }
    }
  }
</style>
