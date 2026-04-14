<script lang="ts">
  import { storage } from "#imports";
  import Textbox from "@/entrypoints/popup/components/Textbox.svelte";
  import ToggleSwitch from "@/entrypoints/popup/components/ToggleSwitch.svelte";
  import { keys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { StorageKey } from "@/lib/utils-initials";

  interface Props {
    isAutoLike: boolean;
    autoLikeThreshold: number;
    isAutoLikeSubscribedChannels: boolean;
  }

  let { isAutoLike = $bindable(), autoLikeThreshold = $bindable(), isAutoLikeSubscribedChannels = $bindable() }: Props = $props();

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
      <Textbox {isAutoLike} disabled={keys.isRecording} bind:value={autoLikeThreshold} />
    </div>
    <ToggleSwitch disabled={keys.isRecording} bind:checked={isAutoLikeSubscribedChannels}>Auto-like in subscribed channels</ToggleSwitch>
  </div>
</section>

<style>
  h2 {
    margin: 0 0 16px;
    font-weight: 600;
    font-size: 1rem;
  }

  .content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .auto-like-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
