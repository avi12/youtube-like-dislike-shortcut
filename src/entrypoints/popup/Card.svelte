<script lang="ts">
  import { onMount } from "svelte";
  import { storage } from "#imports";
  import AutoLike from "@/entrypoints/popup/sections/AutoLike.svelte";
  import KeyboardShortcut from "@/entrypoints/popup/sections/KeyboardShortcut.svelte";
  import { autoLikeManager } from "@/entrypoints/popup/sections/autolike.svelte.js";
  import { defaultShortcuts, keys, ShortcutType } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { type ButtonTriggers } from "@/lib/types";
  import { initial, MODIFIER_KEYS } from "@/lib/utils-initials";

  Promise.all([
    storage.getItem<typeof defaultShortcuts>("local:keyboardShortcuts", { fallback: defaultShortcuts }),
    storage.getItem<typeof initial.isAutoLike>("sync:isAutoLike", { fallback: initial.isAutoLike }),
    storage.getItem<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", { fallback: initial.autoLikeThreshold })
  ]).then(([pKeyboardShortcuts, pIsAutoLike, pAutoLikeThreshold]) => {
    keys.combos = pKeyboardShortcuts;
    autoLikeManager.isAutoLike = pIsAutoLike;
    autoLikeManager.autoLikeThreshold = pAutoLikeThreshold;
  });

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
        primary: keys.combos.like.filter(key => !MODIFIER_KEYS.includes(key)),
        modifiers: keys.combos.like.filter(key => MODIFIER_KEYS.includes(key)),
        secondary: keys.combosSecondary.like
      },
      dislike: {
        primary: keys.combos.dislike.filter(key => !MODIFIER_KEYS.includes(key)),
        modifiers: keys.combos.dislike.filter(key => MODIFIER_KEYS.includes(key)),
        secondary: keys.combosSecondary.dislike
      },
      unrate: {
        primary: keys.combos.unrate.filter(key => !MODIFIER_KEYS.includes(key)),
        modifiers: keys.combos.unrate.filter(key => MODIFIER_KEYS.includes(key)),
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
  <AutoLike />
</main>

<style>
  main {
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    margin-top: 16px;
    padding: 24px;
    border-radius: 24px;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.shortcut-section:not(:first-child)),
  :global(.auto-like-section) {
    padding-top: 20px;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.shortcut-section:not(:last-child)) {
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(121, 129, 145, 0.2);
  }
</style>
