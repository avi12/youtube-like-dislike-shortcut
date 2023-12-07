<script lang="ts">
  import { Storage } from "@plasmohq/storage";
  import Textbox from "~popup/components/Textbox.svelte";
  import ToggleSwitch from "~popup/components/ToggleSwitch.svelte";
  import { autoLikeThreshold, isAutoLike } from "~popup/popup/sections/store-autolike";
  import { isRecording } from "~popup/popup/sections/store-keyboard";
  import { initial } from "~utils-initials";

  const storageSync = new Storage({ area: "sync" });

  Promise.all([
    storageSync.get<typeof initial.isAutoLike>("isAutoLike"),
    storageSync.get<typeof initial.autoLikeThreshold>("autoLikeThreshold")
  ]).then(
    ([
      pIsAutoLike = initial.isAutoLike,
      pAutoLikeThreshold = initial.autoLikeThreshold
    ]) => {
      $isAutoLike = pIsAutoLike;
      $autoLikeThreshold = pAutoLikeThreshold;
    }
  );

  $: {
    storageSync.set("isAutoLike", $isAutoLike);
  }

  $: {
    storageSync.set("autoLikeThreshold", $autoLikeThreshold);
  }
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
  </div>
</section>

<style lang="scss">
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
