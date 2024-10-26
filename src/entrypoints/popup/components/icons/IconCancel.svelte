<script lang="ts">
  interface Props {
    disabled?: boolean;
  }

  const { disabled = false }: Props = $props();
</script>

<svg class:disabled fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 4L4 12" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
  <path d="M4 4L12 12" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.33333" />
</svg>

<style>
  path {
    fill: var(--button-cancel-color);
  }

  .disabled {
    & path {
      fill: var(--button-disabled-icon-color);
    }
  }
</style>
