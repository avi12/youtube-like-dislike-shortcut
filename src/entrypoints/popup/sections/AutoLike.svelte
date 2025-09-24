<script lang="ts">
  import { storage } from "#imports";
  import Textbox from "@/entrypoints/popup/components/Textbox.svelte";
  import ToggleSwitch from "@/entrypoints/popup/components/ToggleSwitch.svelte";
  import { autoLikeManager } from "@/entrypoints/popup/sections/autolike.svelte.js";
  import { keys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { initial } from "@/lib/utils-initials";

  Promise.all([
    storage.getItem<typeof initial.isAutoLike>("sync:isAutoLike", { fallback: initial.isAutoLike }),
    storage.getItem<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", {
      fallback: initial.autoLikeThreshold
    }),
    storage.getItem<typeof initial.isAutoLikeSubscribedChannels>("sync:isAutoLikeSubscribedChannels", {
      fallback: initial.isAutoLikeSubscribedChannels
    })
  ]).then(([pIsAutoLike, pAutoLikeThreshold, pIsAutoLikeSubscribedChannels]) => {
    autoLikeManager.isAutoLike = pIsAutoLike;
    autoLikeManager.autoLikeThreshold = pAutoLikeThreshold;
    autoLikeManager.isAutoLikeSubscribedChannels = pIsAutoLikeSubscribedChannels;
  });

  $effect(() => {
    storage.setItem("sync:isAutoLike", autoLikeManager.isAutoLike);
  });

  $effect(() => {
    storage.setItem("sync:autoLikeThreshold", autoLikeManager.autoLikeThreshold);
  });

  $effect(() => {
    storage.setItem("sync:isAutoLikeSubscribedChannels", autoLikeManager.isAutoLikeSubscribedChannels);
  });
</script>

<section class="auto-like-section">
  <h2>Auto-like videos</h2>
  <div class="content">
    <div class="auto-like-container">
      {#if autoLikeManager.isAutoLike !== undefined}
        <ToggleSwitch disabled={keys.isRecording} bind:checked={autoLikeManager.isAutoLike}>After watched</ToggleSwitch>
      {/if}
      {#if autoLikeManager.autoLikeThreshold !== undefined}
        <Textbox disabled={keys.isRecording} bind:value={autoLikeManager.autoLikeThreshold} />
      {/if}
    </div>
    {#if autoLikeManager.isAutoLikeSubscribedChannels !== undefined}
      <ToggleSwitch disabled={keys.isRecording} bind:checked={autoLikeManager.isAutoLikeSubscribedChannels}
      >Auto-like in subscribed channels
      </ToggleSwitch>
    {/if}
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
