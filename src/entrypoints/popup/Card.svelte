<script lang="ts">
  import { onMount } from "svelte";
  import { derived } from "svelte/store";
  import { storage } from "wxt/storage";
  import AutoLike from "@/entrypoints/popup/sections/AutoLike.svelte";
  import KeyboardShortcut from "@/entrypoints/popup/sections/KeyboardShortcut.svelte";
  import { autoLikeThreshold, isAutoLike } from "@/entrypoints/popup/sections/store-autolike";
  import {
    defaultShortcuts,
    keyCombos,
    keyCombosSecondary,
    ShortcutType
  } from "@/entrypoints/popup/sections/store-keyboard";
  import { type ButtonTriggers } from "@/lib/types";
  import { getValue, initial, MODIFIER_KEYS } from "@/lib/utils-initials";

  Promise.all([
    storage.getItem<typeof defaultShortcuts>("local:keyboardShortcuts", { fallback: defaultShortcuts }),
    storage.getItem<typeof initial.isAutoLike>("sync:isAutoLike", { fallback: initial.isAutoLike }),
    storage.getItem<typeof initial.autoLikeThreshold>("sync:autoLikeThreshold", { fallback: initial.autoLikeThreshold })
  ]).then(([pKeyboardShortcuts, pIsAutoLike, pAutoLikeThreshold]) => {
    $keyCombos = getValue(pKeyboardShortcuts);
    $isAutoLike = getValue(pIsAutoLike);
    $autoLikeThreshold = getValue(pAutoLikeThreshold);
  });

  function getShortcut(obj: typeof initial.buttonTriggers.like) {
    return [...obj.modifiers, ...obj.primary];
  }

  onMount(async () => {
    const buttonTriggers = await storage.getItem<ButtonTriggers>("local:buttonTriggers", {
      fallback: initial.buttonTriggers
    });
    $keyCombos = {
      like: buttonTriggers ? getShortcut(buttonTriggers.like) : getShortcut(initial.buttonTriggers.like),
      dislike: buttonTriggers ? getShortcut(buttonTriggers.dislike) : getShortcut(initial.buttonTriggers.dislike),
      unrate: buttonTriggers ? getShortcut(buttonTriggers.unrate) : getShortcut(initial.buttonTriggers.unrate)
    };
    $keyCombosSecondary = {
      like: buttonTriggers ? buttonTriggers.like.secondary : initial.buttonTriggers.like.secondary,
      dislike: buttonTriggers ? buttonTriggers.dislike.secondary : initial.buttonTriggers.dislike.secondary,
      unrate: buttonTriggers ? buttonTriggers.unrate.secondary : initial.buttonTriggers.unrate.secondary
    };
    const combinedStore = derived([keyCombos, keyCombosSecondary], ([pKeyCombos, pKeyCombosSecondary]) => ({
      pKeyCombos,
      pKeyCombosSecondary
    }));

    combinedStore.subscribe(({ pKeyCombos, pKeyCombosSecondary }) => {
      storage.setItem("local:buttonTriggers", {
        like: {
          primary: pKeyCombos.like.filter(key => !MODIFIER_KEYS.includes(key)),
          modifiers: pKeyCombos.like.filter(key => MODIFIER_KEYS.includes(key)),
          secondary: pKeyCombosSecondary.like
        },
        dislike: {
          primary: pKeyCombos.dislike.filter(key => !MODIFIER_KEYS.includes(key)),
          modifiers: pKeyCombos.dislike.filter(key => MODIFIER_KEYS.includes(key)),
          secondary: pKeyCombosSecondary.dislike
        },
        unrate: {
          primary: pKeyCombos.unrate.filter(key => !MODIFIER_KEYS.includes(key)),
          modifiers: pKeyCombos.unrate.filter(key => MODIFIER_KEYS.includes(key)),
          secondary: pKeyCombosSecondary.unrate
        }
      } as ButtonTriggers);
    });
  });
</script>

<main>
  {#if $keyCombos && $keyCombosSecondary}
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
