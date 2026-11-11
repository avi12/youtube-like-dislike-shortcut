<script lang="ts">
  import { storage } from "#imports";
  import ToggleSwitch from "@/entrypoints/popup/components/ToggleSwitch.svelte";
  import { keys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type EnabledSurfaces } from "@/lib/surfaces";
  import { StorageKey, Surface } from "@/lib/utils-initials";

  interface Props {
    enabledSurfaces: EnabledSurfaces;
  }

  let { enabledSurfaces = $bindable() }: Props = $props();

  const surfaceLabels: Record<Surface, string> = {
    [Surface.youtube]: "YouTube",
    [Surface.shorts]: "YouTube Shorts",
    [Surface.music]: "YouTube Music"
  };
</script>

<section class="surfaces-section">
  <h2>Where should I work?</h2>
  <div class="content">
    {#each Object.values(Surface) as surface (surface)}
      <ToggleSwitch
        disabled={keys.isRecording}
        onchange={e => storage.setItem(StorageKey.enabledSurfaces, { ...enabledSurfaces, [surface]: e.currentTarget.checked })}
        bind:checked={enabledSurfaces[surface]}>
        {surfaceLabels[surface]}
      </ToggleSwitch>
    {/each}
  </div>
</section>

<style>
  .surfaces-section {
    padding-block: 12px;
  }

  h2 {
    margin: 0 0 16px;
    font-weight: 500;
    font-size: 1.25rem;
    letter-spacing: 0;
  }

  .content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
