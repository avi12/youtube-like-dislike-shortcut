<script lang="ts">
  import { storage } from "wxt/storage";
  import Textbox from "@/entrypoints/popup/components/Textbox.svelte";
  import ToggleSwitch from "@/entrypoints/popup/components/ToggleSwitch.svelte";
  import {
    autoLikeThreshold,
    isAutoLike,
    isAutoLikeSubscribedChannels
  } from "@/entrypoints/popup/sections/store-autolike";
  import { isRecording } from "@/entrypoints/popup/sections/store-keyboard";
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
    $isAutoLike = pIsAutoLike;
    $autoLikeThreshold = pAutoLikeThreshold;
    $isAutoLikeSubscribedChannels = pIsAutoLikeSubscribedChannels;
  });

  $effect(() => {
    storage.setItem("sync:isAutoLike", $isAutoLike);
  });

  $effect(() => {
    storage.setItem("sync:autoLikeThreshold", $autoLikeThreshold);
  });

  $effect(() => {
    storage.setItem("sync:isAutoLikeSubscribedChannels", $isAutoLikeSubscribedChannels);
  });
</script>

<section class="auto-like-section">
  <h2>Auto-like videos</h2>
  <div class="content">
    <div class="auto-like-container">
      {#if $isAutoLike !== undefined}
        <ToggleSwitch disabled={$isRecording} bind:checked={$isAutoLike}>After watched</ToggleSwitch>
      {/if}
      {#if $autoLikeThreshold !== undefined}
        <Textbox disabled={$isRecording} bind:value={$autoLikeThreshold} />
      {/if}
    </div>
    {#if $isAutoLikeSubscribedChannels !== undefined}
      <ToggleSwitch disabled={$isRecording} bind:checked={$isAutoLikeSubscribedChannels}
        >Auto-like in subscribed channels
      </ToggleSwitch>
    {/if}
  </div>
</section>

<style>
  h2 {
    margin: 0 0 16px 0;
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
