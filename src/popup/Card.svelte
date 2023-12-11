<script lang="ts">
  import { Storage } from "@plasmohq/storage";
  import { onMount } from "svelte";
  import { derived } from "svelte/store";
  import AutoLike from "~popup/sections/AutoLike.svelte";
  import KeyboardShortcut from "~popup/sections/KeyboardShortcut.svelte";
  import { autoLikeThreshold, isAutoLike } from "~popup/sections/store-autolike";
  import { defaultShortcuts, keyCombos, keyCombosSecondary } from "~popup/sections/store-keyboard";
  import type { ButtonTriggers } from "~types";
  import { initial, MODIFIER_KEYS } from "~utils-initials";

  const storageLocal = new Storage({ area: "local" });
  const storageSync = new Storage({ area: "sync" });

  Promise.all([
    storageLocal.get<typeof defaultShortcuts>("keyboardShortcuts"),
    storageSync.get<typeof initial.isAutoLike>("isAutoLike"),
    storageSync.get<typeof initial.autoLikeThreshold>("autoLikeThreshold")
  ]).then(
    ([
      pKeyboardShortcuts = defaultShortcuts,
      pIsAutoLike = initial.isAutoLike,
      pAutoLikeThreshold = initial.autoLikeThreshold
    ]) => {
      $keyCombos = pKeyboardShortcuts as typeof defaultShortcuts;
      $isAutoLike = pIsAutoLike as typeof initial.isAutoLike;
      $autoLikeThreshold = pAutoLikeThreshold as typeof initial.autoLikeThreshold;
    }
  );

  function getShortcut(obj: typeof initial.buttonTriggers.like) {
    return [...obj.modifiers, ...obj.primary];
  }

  onMount(async () => {
    const buttonTriggers = await storageLocal.get<ButtonTriggers>("buttonTriggers");
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
      storageLocal.set("buttonTriggers", {
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
    <KeyboardShortcut type="like">Like</KeyboardShortcut>
    <KeyboardShortcut type="dislike">Dislike</KeyboardShortcut>
    <KeyboardShortcut type="unrate">Un-rate</KeyboardShortcut>
  {/if}
  <AutoLike />
</main>

<style lang="scss">
  main {
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    margin-top: 16px;
    padding: 24px;
    border-radius: 24px;
  }

  :global(.shortcut-section:not(:first-child)),
  :global(.auto-like-section) {
    padding-top: 20px;
  }

  :global(.shortcut-section:not(:last-child)) {
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(121, 129, 145, 0.2);
  }
</style>
