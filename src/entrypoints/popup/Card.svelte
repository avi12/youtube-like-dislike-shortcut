<script lang="ts">
  import { storage } from "#imports";
  import AutoLike from "@/entrypoints/popup/sections/AutoLike.svelte";
  import KeyboardShortcut from "@/entrypoints/popup/sections/KeyboardShortcut.svelte";
  import { keys, ShortcutType } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type ButtonTriggers } from "@/lib/types";
  import { isModifier, StorageKey } from "@/lib/utils-initials";

  interface Props {
    isAutoLike: boolean;
    autoLikeThreshold: number;
    isAutoLikeSubscribedChannels: boolean;
  }
  const { isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels }: Props = $props();

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
  <AutoLike {isAutoLike} {autoLikeThreshold} {isAutoLikeSubscribedChannels} />
</main>

<style>
  main {
    margin-top: 16px;
    padding: 24px;
    border: 1px solid var(--card-border);
    border-radius: 24px;
    background-color: var(--card-bg);
  }
</style>
