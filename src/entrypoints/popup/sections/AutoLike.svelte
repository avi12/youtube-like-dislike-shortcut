<script lang="ts">
  import { storage } from "#imports";
  import Textbox from "@/entrypoints/popup/components/Textbox.svelte";
  import ToggleSwitch from "@/entrypoints/popup/components/ToggleSwitch.svelte";
  import Surfaces from "@/entrypoints/popup/sections/Surfaces.svelte";
  import { keys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type EnabledSurfaces } from "@/lib/surfaces";
  import { StorageKey } from "@/lib/utils-initials";

  interface Props {
    enabledSurfaces: EnabledSurfaces;
    isAutoLike: boolean;
    autoLikeThreshold: number;
    isAutoLikeSubscribedChannels: boolean;
  }

  let { enabledSurfaces, isAutoLike = $bindable(), autoLikeThreshold = $bindable(), isAutoLikeSubscribedChannels = $bindable() }: Props = $props();

  $effect(() => {
    storage.setItem(StorageKey.isAutoLike, isAutoLike);
  });

  $effect(() => {
    storage.setItem(StorageKey.autoLikeThreshold, autoLikeThreshold);
  });

  $effect(() => {
    storage.setItem(StorageKey.isAutoLikeSubscribedChannels, isAutoLikeSubscribedChannels);
  });
</script>

<section class="auto-like-section">
  <h2>Auto-like videos</h2>
  <div class="content">
    <div class="auto-like-container">
      <ToggleSwitch disabled={keys.isRecording} bind:checked={isAutoLike}>After watched</ToggleSwitch>
      <Textbox disabled={keys.isRecording} {isAutoLike} bind:value={autoLikeThreshold} />
    </div>
    <ToggleSwitch disabled={keys.isRecording} bind:checked={isAutoLikeSubscribedChannels}>Auto-like in subscribed channels</ToggleSwitch>
  </div>
  <Surfaces disabled={!isAutoLike && !isAutoLikeSubscribedChannels} {enabledSurfaces} />
</section>

<style>
  .auto-like-section {
    padding-block: 10px;
  }

  h2 {
    display: flex;
    align-items: center;
    min-block-size: 32px;
    margin: 0 0 8px;
    font-weight: 500;
    font-size: 1rem;
    letter-spacing: 0;
  }

  .content {
    display: flex;
    flex-wrap: wrap;
    gap: 40px;
    row-gap: 8px;
    align-items: center;
  }

  .auto-like-container {
    display: flex;
    gap: 16px;
    align-items: center;
  }
</style>
