<script lang="ts">
  import Card from "./Card.svelte";
  import Header from "./Header/Header.svelte";
  import { type ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";
  import { type EnabledSurfaces } from "@/lib/surfaces";

  interface Props {
    selectedTheme: ThemeMode;
    enabledSurfaces: EnabledSurfaces;
    isAutoLike: boolean;
    autoLikeThreshold: number;
    isAutoLikeSubscribedChannels: boolean;
  }
  const { selectedTheme, enabledSurfaces, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels }: Props = $props();
</script>

<Header {selectedTheme} />
<Card {enabledSurfaces} {isAutoLike} {autoLikeThreshold} {isAutoLikeSubscribedChannels} />
