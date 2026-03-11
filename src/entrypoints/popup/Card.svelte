<script lang="ts">
  import { onMount } from "svelte";
  import { storage } from "#imports";
  import AutoLike from "@/entrypoints/popup/sections/AutoLike.svelte";
  import KeyboardShortcut from "@/entrypoints/popup/sections/KeyboardShortcut.svelte";
  import { defaultShortcuts, keys, ShortcutType } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type ButtonTriggers } from "@/lib/types";
  import { initial, isModifier } from "@/lib/utils-initials";

  storage.getItem<typeof defaultShortcuts>("local:keyboardShortcuts", { fallback: defaultShortcuts }).then(shortcuts => {
    keys.combos = shortcuts;
  });

  const autoLikePromise = Promise.all([
    storage.getItem<typeof initial.isAutoLike>("sync:isAutoLike", { fallback: initial.isAutoLike }),
    storage.getItem<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", { fallback: initial.autoLikeThreshold }),
    storage.getItem<typeof initial.isAutoLikeSubscribedChannels>("sync:isAutoLikeSubscribedChannels", { fallback: initial.isAutoLikeSubscribedChannels })
  ]);

  function getShortcut(obj: typeof initial.buttonTriggers.like) {
    return [...obj.modifiers, ...obj.primary];
  }

  onMount(async () => {
    const buttonTriggers = await storage.getItem<ButtonTriggers>("local:buttonTriggers", {
      fallback: initial.buttonTriggers
    });
    keys.combos = {
      like: buttonTriggers ? getShortcut(buttonTriggers.like) : getShortcut(initial.buttonTriggers.like),
      dislike: buttonTriggers ? getShortcut(buttonTriggers.dislike) : getShortcut(initial.buttonTriggers.dislike),
      unrate: buttonTriggers ? getShortcut(buttonTriggers.unrate) : getShortcut(initial.buttonTriggers.unrate)
    };
    keys.combosSecondary = {
      like: buttonTriggers ? buttonTriggers.like.secondary : initial.buttonTriggers.like.secondary,
      dislike: buttonTriggers ? buttonTriggers.dislike.secondary : initial.buttonTriggers.dislike.secondary,
      unrate: buttonTriggers ? buttonTriggers.unrate.secondary : initial.buttonTriggers.unrate.secondary
    };
  });

  $effect(() => {
    storage.setItem<ButtonTriggers>("local:buttonTriggers", {
      like: {
        primary: keys.combos.like.filter(key => !isModifier(key)),
        modifiers: keys.combos.like.filter(isModifier),
        secondary: keys.combosSecondary.like
      },
      dislike: {
        primary: keys.combos.dislike.filter(key => !isModifier(key)),
        modifiers: keys.combos.dislike.filter(isModifier),
        secondary: keys.combosSecondary.dislike
      },
      unrate: {
        primary: keys.combos.unrate.filter(key => !isModifier(key)),
        modifiers: keys.combos.unrate.filter(isModifier),
        secondary: keys.combosSecondary.unrate
      }
    });
  });
</script>

<main>
  {#if keys.combos && keys.combosSecondary}
    <KeyboardShortcut type={ShortcutType.like}>Like</KeyboardShortcut>
    <KeyboardShortcut type={ShortcutType.dislike}>Dislike</KeyboardShortcut>
    <KeyboardShortcut type={ShortcutType.unrate}>Un-rate</KeyboardShortcut>
  {/if}
  {#await autoLikePromise then [isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels]}
    <AutoLike {isAutoLike} {autoLikeThreshold} {isAutoLikeSubscribedChannels} />
  {/await}
</main>

<style>
  main {
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    margin-top: 16px;
    padding: 24px;
    border-radius: 24px;
  }

  /* noinspection CssUnusedSymbol */
  :global(.shortcut-section:not(:first-child)),
  :global(.auto-like-section) {
    padding-top: 20px;
  }

  /* noinspection CssUnusedSymbol */
  :global(.shortcut-section:not(:last-child)) {
    padding-bottom: 16px;
    border-bottom: 1px solid rgb(121 129 145 / 20%);
  }
</style>
