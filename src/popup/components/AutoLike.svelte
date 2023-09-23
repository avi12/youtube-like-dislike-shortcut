<script lang="ts">
  import { initial } from "../../utils-initials";
  import { Slider, Switch, TextField } from "svelte-materialify";

  export let isAutoLike = initial.isAutoLike;
  export let isAutoLikeSubscribedChannels = initial.isAutoLikeSubscribedChannels;
  export let autoLikeThreshold = initial.autoLikeThreshold;

  $: {
    // noinspection TypeScriptUnresolvedFunction
    chrome.storage.sync.set({ isAutoLike });
  }

  $: {
    // noinspection TypeScriptUnresolvedFunction
    chrome.storage.sync.set({ isAutoLikeSubscribedChannels });
  }

  function debounce(func, timeout = 300): (...args) => void {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), timeout);
    };
  }
</script>

<section class="pl-3 pr-5" class:is-auto-like={isAutoLike}>
  <Switch class="pt-5 mb-6" on:change={e => (isAutoLike = e.currentTarget.checked)} checked={isAutoLike}>
    Auto-like videos
  </Switch>
  {#if isAutoLike}
    <Slider
      bind:value={autoLikeThreshold}
      min={1}
      max={99}
      thumb
      on:update={debounce(e => chrome.storage.sync.set({ autoLikeThreshold: Number(e.detail.value[0]) }))}
    >
      <span slot="prepend-outer">
        <TextField
          bind:value={autoLikeThreshold}
          on:input={debounce(e => chrome.storage.sync.set({ autoLikeThreshold: Number(e.currentTarget.value) }))}
          min={1}
          max={99}
          type="number"
        >
          Like after watched
          <span slot="append">%</span>
        </TextField>
      </span>
    </Slider>

    <!-- Add a switch "Auto-like subscribed channels" -->
    <Switch
      class="pt-5"
      on:change={e => (isAutoLikeSubscribedChannels = e.currentTarget.checked)}
      checked={isAutoLikeSubscribedChannels}
    >
      Auto-like in subscribed channels
    </Switch>
  {/if}
</section>

<style>
  /*noinspection CssUnusedSymbol*/
  :global(.s-text-field__input) {
    width: 80px;
  }

  /*noinspection CssUnusedSymbol*/
  span[slot="prepend-outer"],
  :global(.s-input__slot) {
    margin-bottom: 0 !important;
  }
</style>
