<script lang="ts">
  import { Storage } from "@plasmohq/storage";
  import { Switch } from "svelte-materialify";


  import Slider from "~popup/components/Slider.svelte";
  import TextField from "~popup/components/TextField.svelte";
  import { initial } from "~utils-initials";

  export let isAutoLike = initial.isAutoLike;
  export let autoLikeThreshold = initial.autoLikeThreshold;

  const storageSync = new Storage({ area: "sync" });

  $: {
    storageSync.set("isAutoLike", isAutoLike);
  }

  function debounce(func, timeout = 300): (...args) => void {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), timeout);
    };
  }
</script>

<section class="pl-3 pr-5">
  <Switch bind:checked={isAutoLike} class="pt-5">Auto-like videos</Switch>
  {#if isAutoLike}
    <Slider
      bind:value={autoLikeThreshold}
      min={1}
      max={99}
      on:update={debounce(e => storageSync.set("autoLikeThreshold", Number(e.detail.value[0])))}
    >
      <span slot="prepend-outer">
        <TextField
          bind:value={autoLikeThreshold}
          on:input={debounce(e => storageSync.set("autoLikeThreshold", Number(e.detail.value)))}
          min={1}
          max={99}
          type="number"
        >
          Like after watched
          <span slot="append">%</span>
        </TextField>
      </span>
    </Slider>
  {/if}
</section>
