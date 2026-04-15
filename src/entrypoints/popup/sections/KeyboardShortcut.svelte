<script lang="ts">
  import type { Snippet } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
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
  import { isModifier, keyToModifier, MODIFIER_KEYCODES, modifierToKey } from "@/lib/utils-initials";

  interface Props {
    type: ShortcutType;
    children?: Snippet;
  }

  const { type, children }: Props = $props();

  let error = $state("");
  const pressedKeys = new SvelteSet<string>();
  // Tracks all modifiers pressed this session. Never cleared on keyup so that
  // Windows's fake Shift injection (fired before/after Shift+NumpadDigit events)
  // doesn't lose the modifier context. Reset only when recording starts/ends.
  let comboModifiers = $state<string[]>([]);
  let keyComboTemp = $state<string[]>([]);
  const isMac = navigator.platform.includes("Mac");

  const active = $derived(keys.isRecording && keys.currentlyRecording === type);
  const currentModifiers = $derived(keys.combos[type].filter(isModifier));
  const currentNonModifiers = $derived(keys.combos[type].filter(key => !isModifier(key)));
  const displayedKeyComboList = $derived(
    (keys.isRecording && keys.currentlyRecording === type
      ? keyComboTemp
      : [
        ...currentModifiers.map(key => key.replace(isMac ? "Ctrl" : "Cmd", isMac ? "Cmd" : "Ctrl")),
        ...currentNonModifiers
      ]
    ).map(keyToModifier)
  );
  const isHasAnotherShortcut = $derived(defaultAdditionalShortcuts[displayedKeyComboList.join(" + ")]);

  const REGEX_MODIFIERS = new RegExp(`(${MODIFIER_KEYCODES.join("|")})`, "g");

  const keyCombo = $derived.by(() => {
    const nonModifiers = [...pressedKeys].filter(key => !isModifier(key)).sort();
    return [...comboModifiers, ...nonModifiers];
  });

  function resetRecordingState() {
    pressedKeys.clear();
    comboModifiers = [];
  }

  function processKey(event: KeyboardEvent) {
    if (event.key.startsWith("Control")) {
      return "ctrlKey";
    }
    const modifierCode = event.key.replace(REGEX_MODIFIERS, modifierToKey);
    if (isModifier(modifierCode)) {
      return modifierCode;
    }
    return event.code;
  }

  function getIsKeyCombosTheSame(keyCombo1: string[], keyCombo2: string[]) {
    return keyCombo1.join(" + ") === keyCombo2.join(" + ");
  }

  function getHasConflicts(newKeyCombo: string[]) {
    for (const currentType of Object.values(ShortcutType)) {
      if (currentType !== type && getIsKeyCombosTheSame(keys.combos[currentType], newKeyCombo)) {
        error = `Conflicts with ${currentType}'s shortcut`;
        return true;
      }
    }
    error = "";
    return false;
  }

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (!keys.isRecording || keys.currentlyRecording !== type) {
        return;
      }
      e.preventDefault();
      error = "";
      const key = processKey(e);
      if (pressedKeys.has(key)) {
        return;
      }
      pressedKeys.add(key);
      if (isModifier(key)) {
        if (comboModifiers.includes(key)) {
          // Windows fake Shift re-injection after a Shift+NumpadDigit event -
          // the modifier was already tracked, so skip updating keyComboTemp.
          return;
        }
        comboModifiers = [...comboModifiers, key].sort();
      }
      keyComboTemp = keyCombo;
    }

    function handleKeyup(e: KeyboardEvent) {
      if (!keys.isRecording || keys.currentlyRecording !== type) {
        return;
      }
      const key = processKey(e);

      // If a non-modifier key's keydown was intercepted by the browser (e.g. Shift+Insert
      // treated as paste), recover using the modifiers tracked so far this session.
      if (!isModifier(key) && !pressedKeys.has(key) && comboModifiers.length > 0) {
        keyComboTemp = [...comboModifiers, key];
        pressedKeys.clear();
      }

      pressedKeys.delete(key);
      if (pressedKeys.size !== 0) {
        return;
      }

      const isOnlyModifiers = keyComboTemp.every(isModifier);
      if (isOnlyModifiers || getHasConflicts(keyComboTemp)) {
        return;
      }

      comboModifiers = [];
      keys.combos = { ...keys.combos, [type]: keyComboTemp };
      keys.isRecording = false;
      keys.currentlyRecording = null;
      const isSecondaryShortcutExists = displayedKeyComboList.join(" + ") in defaultAdditionalShortcuts;
      if (isSecondaryShortcutExists) {
        keys.combosSecondary = { ...keys.combosSecondary, [type]: true };
      }
    };

    addEventListener("keydown", handleKeydown);
    addEventListener("keyup", handleKeyup);
    return () => {
      removeEventListener("keydown", handleKeydown);
      removeEventListener("keyup", handleKeyup);
    };
  });
</script>

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

        resetRecordingState();
        keyComboTemp = keys.combos[type];
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
        Also use {isHasAnotherShortcut}
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
          resetRecordingState();
          keys.isRecording = false;
          keys.currentlyRecording = null;
          keyComboTemp = keys.combos[type];
          error = "";
        }} />
    {:else}
      <ButtonReset
        disabled={getIsKeyCombosTheSame(keys.combos[type], defaultShortcuts[type]) || keys.isRecording}
        onclick={() => {
          pressedKeys.clear();
          keys.combos = { ...keys.combos, [type]: defaultShortcuts[type] };
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

    &:not(:first-child) {
      padding-top: 20px;
    }

    &:not(:last-child) {
      padding-bottom: 16px;
      border-bottom: 1px solid rgb(121 129 145 / 20%);
    }
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
    gap: 40px;
    align-items: center;
  }

  .error {
    color: var(--button-shortcut-error-bg);
  }
</style>
