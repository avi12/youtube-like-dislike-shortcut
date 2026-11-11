<script lang="ts">
  import { storage } from "#imports";
  import ToggleSwitch from "@/entrypoints/popup/components/ToggleSwitch.svelte";
  import { keys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type EnabledSurfaces } from "@/lib/surfaces";
  import { StorageKey, Surface } from "@/lib/utils-initials";

  interface Props {
    enabledSurfaces: EnabledSurfaces;
    disabled: boolean;
  }

  let { enabledSurfaces = $bindable(), disabled }: Props = $props();

  const surfaceLabels: Record<Surface, string> = {
    [Surface.youtube]: "YouTube",
    [Surface.shorts]: "YouTube Shorts",
    [Surface.music]: "YouTube Music"
  };
</script>

<div class="surfaces">
  <h3>Only auto-like on</h3>
  <div class="content">
    {#each Object.values(Surface) as surface (surface)}
      <ToggleSwitch
        disabled={keys.isRecording || disabled}
        onchange={e => storage.setItem(StorageKey.enabledSurfaces, { ...enabledSurfaces, [surface]: e.currentTarget.checked })}
        bind:checked={enabledSurfaces[surface]}>
        {surfaceLabels[surface]}
      </ToggleSwitch>
    {/each}
  </div>
</div>

<style>
  .surfaces {
    margin-top: 12px;
  }

  h3 {
    margin: 0 0 8px;
    color: var(--md-on-surface-variant);
    font-weight: 500;
    font-size: 0.875rem;
  }

  .content {
    display: flex;
    gap: 40px;
    align-items: center;
  }
</style>
