<script type="ts">
  import { Button, Icon } from "svelte-materialify";
  import { mdiHeart } from "@mdi/js";
  import { theme } from "../stores";
</script>

<Button outlined={$theme === "dark"} on:click={() => chrome.tabs.create({ url: "https://paypal.me/avi12" })}>
  <Icon class="mr-2" path={mdiHeart} />
  Donate
</Button>
