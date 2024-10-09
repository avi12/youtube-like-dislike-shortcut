<script lang="ts">
  import { fade } from "svelte/transition";
  import ButtonCancel from "@/entrypoints/popup/components/ButtonCancel.svelte";
  import ButtonReset from "@/entrypoints/popup/components/ButtonReset.svelte";
  import ButtonShortcut from "@/entrypoints/popup/components/ButtonShortcut.svelte";
  import Checkbox from "@/entrypoints/popup/components/Checkbox.svelte";
  import {
    currentlyRecording,
    defaultAdditionalShortcuts,
    defaultShortcuts,
    isRecording,
    keyCombos,
    keyCombosSecondary,
    ShortcutType
  } from "@/entrypoints/popup/sections/store-keyboard";
  import { keyToModifier, MODIFIER_KEYCODES, MODIFIER_KEYS, modifierToKey } from "@/lib/utils-initials";

  export let type: ShortcutType;

  let error = "";
  const pressedKeys = new Set<string>();
  let lastShortcut = $keyCombos[type] || [];
  let keyComboTemp = lastShortcut;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_DELAY = 500;
  const isMac = navigator.platform.includes("Mac");

  $: active = $isRecording && $currentlyRecording === type;
  $: currentModifiers = $keyCombos[type].filter(key => MODIFIER_KEYS.includes(key));
  $: currentNonModifiers = $keyCombos[type].filter(key => !MODIFIER_KEYS.includes(key));
  $: displayedKeyComboList = (
    $isRecording && $currentlyRecording === type
      ? keyComboTemp
      : [
        ...currentModifiers.map(key => key.replace(isMac ? "Ctrl" : "Cmd", isMac ? "Cmd" : "Ctrl")),
        ...currentNonModifiers
      ]
  ).map(keyToModifier);
  // @ts-ignore
  $: isHasAnotherShortcut = defaultAdditionalShortcuts[displayedKeyComboList.join(" + ")];

  const REGEX_MODIFIERS = new RegExp(`(${MODIFIER_KEYCODES.join("|")})`, "g");

  function processKey(event: KeyboardEvent) {
    if (event.key.startsWith("Control")) {
      return "ctrlKey";
    }
    const modifierCode = event.key.replace(REGEX_MODIFIERS, modifierToKey);
    // @ts-ignore
    if (MODIFIER_KEYS.includes(modifierCode)) {
      return modifierCode;
    }
    return event.code;
  }

  function getKeyCombo(): string[] {
    const modifiers = [...pressedKeys].filter(key => MODIFIER_KEYS.includes(key)).sort();
    const nonModifiers = [...pressedKeys].filter(key => !MODIFIER_KEYS.includes(key)).sort();
    return [...modifiers, ...nonModifiers];
  }

  function getIsKeyCombosTheSame(keyCombo1: string[], keyCombo2: string[]) {
    return keyCombo1.join(" + ") === keyCombo2.join(" + ");
  }

  function getHasConflicts(newKeyCombo: string[]) {
    for (const currentType in $keyCombos) {
      // @ts-ignore
      if (currentType !== type && getIsKeyCombosTheSame($keyCombos[currentType], newKeyCombo)) {
        error = `Conflicts with ${currentType}'s shortcut`;
        return true;
      }
    }
    error = "";
    return false;
  }
</script>

<svelte:window
  on:keydown={event => {
    if (!$isRecording || $currentlyRecording !== type) {
      return;
    }
    event.preventDefault();
    error = "";
    const key = processKey(event);
    pressedKeys.add(key);
    keyComboTemp = getKeyCombo();
  }}
  on:keyup={event => {
    if (!$isRecording || $currentlyRecording !== type) {
      return;
    }
    const key = processKey(event);
    pressedKeys.delete(key);
    if (pressedKeys.size !== 0) {
      return;
    }

    clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
      const isOnlyModifiers = keyComboTemp.every(key => MODIFIER_KEYS.includes(key));
      if (isOnlyModifiers || getHasConflicts(keyComboTemp)) {
        return;
      }

      lastShortcut = $keyCombos[type];
      $keyCombos = { ...$keyCombos, [type]: keyComboTemp };
      $isRecording = false;
      $currentlyRecording = null;
      const isSecondaryShortcutExists = displayedKeyComboList.join(" + ") in defaultAdditionalShortcuts;
      if (isSecondaryShortcutExists) {
        $keyCombosSecondary = { ...$keyCombosSecondary, [type]: true };
      }
    }, DEBOUNCE_DELAY);
  }} />

<section class="shortcut-section">
  <div class="shortcut-wrapper">
    <ButtonShortcut
      {active}
      disabled={Boolean(error) || ($isRecording && $currentlyRecording !== type)}
      error={Boolean(error) && $currentlyRecording === type}
      on:click={() => {
        if (error) {
          return;
        }

        lastShortcut = $keyCombos[type];
        if (!keyComboTemp) {
          keyComboTemp = lastShortcut;
        }
        $isRecording = !$isRecording;
        $currentlyRecording = type;
      }}>
      {displayedKeyComboList.join(" + ")}
    </ButtonShortcut>
    {#if error}
      <div class="error" in:fade>{error}</div>
    {:else if isHasAnotherShortcut && (!$isRecording || $currentlyRecording !== type)}
      <Checkbox bind:checked={$keyCombosSecondary[type]} disabled={$isRecording && $currentlyRecording !== type}>
        Also use {defaultAdditionalShortcuts[displayedKeyComboList.join(" + ")]}
      </Checkbox>
    {/if}
  </div>
  <div class="head-wrapper">
    <h2>
      <slot />
    </h2>
    {#if $isRecording && $currentlyRecording === type}
      <ButtonCancel
        on:click={() => {
          $isRecording = false;
          $currentlyRecording = null;
          keyComboTemp = lastShortcut;
          error = "";
          $keyCombos = { ...$keyCombos, [type]: lastShortcut };
        }} />
    {:else}
      <ButtonReset
        disabled={getIsKeyCombosTheSame($keyCombos[type], defaultShortcuts[type]) || $isRecording}
        on:click={() => {
          lastShortcut = defaultShortcuts[type];
          keyComboTemp = lastShortcut;
          $keyCombos = { ...$keyCombos, [type]: keyComboTemp };
          $keyCombosSecondary = { ...$keyCombosSecondary, [type]: true };
        }} />
    {/if}
  </div>
</section>

<style>
  .shortcut-section {
    display: flex;
    flex-direction: column-reverse;
    align-items: start;
  }

  .head-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    align-self: stretch;
    margin-bottom: 5px;
  }

  h2 {
    margin: 0;
    font-weight: 400;
    font-size: 1.25rem;
  }

  .shortcut-wrapper {
    display: flex;
    align-items: center;
    gap: 40px;
  }

  .error {
    color: var(--button-shortcut-error-bg);
  }
</style>
