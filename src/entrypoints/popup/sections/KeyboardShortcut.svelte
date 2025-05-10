<script lang="ts">
  import type { Snippet } from "svelte";
  import { fade } from "svelte/transition";
  import ButtonCancel from "@/entrypoints/popup/components/ButtonCancel.svelte";
  import ButtonReset from "@/entrypoints/popup/components/ButtonReset.svelte";
  import ButtonShortcut from "@/entrypoints/popup/components/ButtonShortcut.svelte";
  import Checkbox from "@/entrypoints/popup/components/Checkbox.svelte";
  import {
    defaultAdditionalShortcuts,
    defaultShortcuts,
    keys,
    ShortcutType
  } from "@/entrypoints/popup/sections/keyboard.svelte.js";
  import { keyToModifier, MODIFIER_KEYCODES, MODIFIER_KEYS, modifierToKey } from "@/lib/utils-initials";

  interface Props {
    type: ShortcutType;
    children?: Snippet;
  }

  const { type, children }: Props = $props();

  let error = $state("");
  const pressedKeys = new Set<string>();
  let lastShortcut = $state(keys.combos[type] || []);
  let keyComboTemp = $state(lastShortcut);
  let debounceTimeout = $state<ReturnType<typeof setTimeout>>();
  const DEBOUNCE_DELAY = 500;
  const isMac = navigator.platform.includes("Mac");

  const active = $derived(keys.isRecording && keys.currentlyRecording === type);
  const currentModifiers = $derived(keys.combos[type].filter(key => MODIFIER_KEYS.includes(key)));
  const currentNonModifiers = $derived(keys.combos[type].filter(key => !MODIFIER_KEYS.includes(key)));
  const displayedKeyComboList = $derived(
    (keys.isRecording && keys.currentlyRecording === type
      ? keyComboTemp
      : [
          ...currentModifiers.map(key => key.replace(isMac ? "Ctrl" : "Cmd", isMac ? "Cmd" : "Ctrl")),
          ...currentNonModifiers
        ]
    ).map(keyToModifier)
  );
  // @ts-expect-error Incompatible types
  const isHasAnotherShortcut = $derived(defaultAdditionalShortcuts[displayedKeyComboList.join(" + ")]);

  const REGEX_MODIFIERS = new RegExp(`(${MODIFIER_KEYCODES.join("|")})`, "g");

  function processKey(event: KeyboardEvent) {
    if (event.key.startsWith("Control")) {
      return "ctrlKey";
    }
    const modifierCode = event.key.replace(REGEX_MODIFIERS, modifierToKey);
    // @ts-expect-error Incompatible types
    if (MODIFIER_KEYS.includes(modifierCode)) {
      return modifierCode;
    }
    return event.code;
  }

  function getKeyCombo(): string[] {
    // @ts-expect-error Incompatible types
    const modifiers = [...pressedKeys].filter(key => MODIFIER_KEYS.includes(key)).sort();
    // @ts-expect-error Incompatible types
    const nonModifiers = [...pressedKeys].filter(key => !MODIFIER_KEYS.includes(key)).sort();
    return [...modifiers, ...nonModifiers];
  }

  function getIsKeyCombosTheSame(keyCombo1: string[], keyCombo2: string[]) {
    return keyCombo1.join(" + ") === keyCombo2.join(" + ");
  }

  function getHasConflicts(newKeyCombo: string[]) {
    for (const currentType in keys.combos) {
      // @ts-expect-error Incompatible types
      if (currentType !== type && getIsKeyCombosTheSame(keys.combos[currentType], newKeyCombo)) {
        error = `Conflicts with keysManager.{currentType}'s shortcut`;
        return true;
      }
    }
    error = "";
    return false;
  }
</script>

<svelte:window
  onkeydown={event => {
    if (!keys.isRecording || keys.currentlyRecording !== type) {
      return;
    }
    event.preventDefault();
    error = "";
    const key = processKey(event);
    pressedKeys.add(key);
    keyComboTemp = getKeyCombo();
  }}
  onkeyup={event => {
    if (!keys.isRecording || keys.currentlyRecording !== type) {
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

      lastShortcut = keys.combos[type];
      keys.combos = { ...keys.combos, [type]: keyComboTemp };
      keys.isRecording = false;
      keys.currentlyRecording = null;
      const isSecondaryShortcutExists = displayedKeyComboList.join(" + ") in defaultAdditionalShortcuts;
      if (isSecondaryShortcutExists) {
        keys.combosSecondary = { ...keys.combosSecondary, [type]: true };
      }
    }, DEBOUNCE_DELAY);
  }} />

<section class="shortcut-section">
  <div class="shortcut-wrapper">
    <ButtonShortcut
      {active}
      disabled={Boolean(error) || (keys.isRecording && keys.currentlyRecording !== type)}
      error={Boolean(error) && keys.currentlyRecording === type}
      onclick={() => {
        if (error) {
          return;
        }

        lastShortcut = keys.combos[type];
        if (!keyComboTemp) {
          keyComboTemp = lastShortcut;
        }
        keys.isRecording = !keys.isRecording;
        keys.currentlyRecording = type;
      }}>
      {displayedKeyComboList.join(" + ")}
    </ButtonShortcut>
    {#if error}
      <div class="error" in:fade>{error}</div>
    {:else if isHasAnotherShortcut && (!keys.isRecording || keys.currentlyRecording !== type)}
      <Checkbox
        bind:checked={keys.combosSecondary[type]}
        disabled={keys.isRecording && keys.currentlyRecording !== type}>
        Also use {defaultAdditionalShortcuts[displayedKeyComboList.join(" + ")]}
      </Checkbox>
    {/if}
  </div>
  <div class="head-wrapper">
    <h2>
      {@render children?.()}
    </h2>
    {#if keys.isRecording && keys.currentlyRecording === type}
      <ButtonCancel
        onclick={() => {
          keys.isRecording = false;
          keys.currentlyRecording = null;
          keyComboTemp = lastShortcut;
          error = "";
          keys.combos = { ...keys.combos, [type]: lastShortcut };
        }} />
    {:else}
      <ButtonReset
        disabled={getIsKeyCombosTheSame(keys.combos[type], defaultShortcuts[type]) || keys.isRecording}
        onclick={() => {
          lastShortcut = defaultShortcuts[type];
          keyComboTemp = lastShortcut;
          keys.combos = { ...keys.combos, [type]: keyComboTemp };
          keys.combosSecondary = { ...keys.combosSecondary, [type]: true };
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
