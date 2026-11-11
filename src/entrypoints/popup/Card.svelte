<script lang="ts">
  import { storage } from "#imports";
  import AutoLike from "@/entrypoints/popup/sections/AutoLike.svelte";
  import KeyboardShortcut from "@/entrypoints/popup/sections/KeyboardShortcut.svelte";
  import Surfaces from "@/entrypoints/popup/sections/Surfaces.svelte";
  import { keys, ShortcutType } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type EnabledSurfaces } from "@/lib/surfaces";
  import { type ButtonTriggers } from "@/lib/types";
  import { isModifier, StorageKey } from "@/lib/utils-initials";

  interface Props {
    enabledSurfaces: EnabledSurfaces;
    isAutoLike: boolean;
    autoLikeThreshold: number;
    isAutoLikeSubscribedChannels: boolean;
  }
  const { enabledSurfaces, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels }: Props = $props();

  $effect(() => {
    const { like, dislike, unrate } = keys.combos;
    storage.setItem<ButtonTriggers>(StorageKey.buttonTriggers, {
      like: {
        primary: like.filter(key => !isModifier(key)),
        modifiers: like.filter(isModifier),
        secondary: keys.combosSecondary.like
      },
      dislike: {
        primary: dislike.filter(key => !isModifier(key)),
        modifiers: dislike.filter(isModifier),
        secondary: keys.combosSecondary.dislike
      },
      unrate: {
        primary: unrate.filter(key => !isModifier(key)),
        modifiers: unrate.filter(isModifier),
        secondary: keys.combosSecondary.unrate
      }
    });
  });
</script>

<main>
  <KeyboardShortcut type={ShortcutType.like}>Like</KeyboardShortcut>
  <KeyboardShortcut type={ShortcutType.dislike}>Dislike</KeyboardShortcut>
  <KeyboardShortcut type={ShortcutType.unrate}>Un-rate</KeyboardShortcut>
  <Surfaces {enabledSurfaces} />
  <AutoLike {isAutoLike} {autoLikeThreshold} {isAutoLikeSubscribedChannels} />
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding: 24px;
    border-radius: var(--md-shape-extra-large);
    background-color: var(--md-surface-container);
  }
</style>
