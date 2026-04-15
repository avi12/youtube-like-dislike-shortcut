<script lang="ts">
  import Card from "./Card.svelte";
  import Header from "./Header/Header.svelte";
  import { type ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";

  interface Props {
    selectedTheme: ThemeMode;
    isAutoLike: boolean;
    autoLikeThreshold: number;
    isAutoLikeSubscribedChannels: boolean;
  }
  const { selectedTheme, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels }: Props = $props();
</script>

<Header {selectedTheme} />
<Card {isAutoLike} {autoLikeThreshold} {isAutoLikeSubscribedChannels} />
