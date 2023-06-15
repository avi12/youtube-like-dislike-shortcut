<script lang="ts">
  import { initial } from "../../utils-initials";
  import { DataTableCell, DataTableRow } from "svelte-materialify/dist";
  import {
    actionNameToDisplay,
    buttonTriggersYouTube,
    modifierToKeyButton,
    modifierToKeyDisplay,
    numpadAliases
  } from "../mappers";
  import { buttonTriggers, recordingAction } from "../stores";
  import type { ButtonTrigger, Modifier } from "../../types";
  import ButtonShortcut from "./ButtonShortcut.svelte";
  import { getJoinedModifiers } from "../utils";
  import Alias from "./Alias.svelte";
  import ButtonCancel from "./ButtonCancel.svelte";
  import ButtonReset from "./ButtonReset.svelte";

  const errorMessage = {
    youtube: "Cannot assign. Used by YouTube",
    alreadyInUse: "Cannot assign. Already in use"
  } as const;

  const keysSet = new Set<string>();
  let modifierKeys: Modifier[];
  let nonModifierKeys: string[];
  let recordingKeys = "";
  let isErrorRecording = false;
  let isAlreadyInUse = false;

  function onKeyDown(e: KeyboardEvent): void {
    keysSet.add(e.code);
    setKeys();
    if (nonModifierKeys.length > 1) {
      for (let i = 0; i < nonModifierKeys.length - 1; i++) {
        const nonModifierKey = nonModifierKeys[i];
        keysSet.delete(nonModifierKey);
      }
    }
    setKeys();
    recordingKeys = [...getModifiers(), ...nonModifierKeys].join(" + ");

    isAlreadyInUse = getIsAlreadyInUse();
    isErrorRecording = Boolean(buttonTriggersYouTube[recordingKeys] || isAlreadyInUse);
  }

  function record(): void {
    isErrorRecording = false;
    stopRecording();
    keysSet.clear();
    modifierKeys = [];
    nonModifierKeys = [];
    document.addEventListener("keydown", onKeyDown);
  }

  function stopRecording(): void {
    document.removeEventListener("keydown", onKeyDown);
    const modifiersCount = modifierKeys?.length ?? 0;
    const nonModifierCount = nonModifierKeys?.length ?? 0;
    const isShortcutEligibleForStorage = (modifiersCount > 0 && nonModifierCount > 0) || nonModifierCount > 0;
    if ($recordingAction && isShortcutEligibleForStorage) {
      buttonTriggers.update(buttons => ({ ...buttons, [$recordingAction]: getButtonTriggers() }));
    }
  }

  function getModifiers(): string[] {
    return [...new Set(modifierKeys.map(modifier => modifierToKeyDisplay[modifier]))].sort();
  }

  function setKeys(): void {
    const keys = [...keysSet];
    modifierKeys = keys.filter(key => modifierToKeyButton[key]).map(key => modifierToKeyButton[key]);
    nonModifierKeys = keys.filter(key => !modifierToKeyButton[key]);
  }

  function getButtonTriggers(): ButtonTrigger {
    const lastKey = nonModifierKeys[nonModifierKeys.length - 1];
    return {
      primary: lastKey,
      modifiers: modifierKeys,
      secondary:
        numpadAliases[`${modifierKeys.map(key => modifierToKeyDisplay[key]).join(" + ")} + ${lastKey}`]
    };
  }

  buttonTriggers.subscribe(buttonTriggers => {
    // noinspection TypeScriptUnresolvedFunction
    chrome.storage.local.set({ buttonTriggers });
  });

  function getIsAlreadyInUse(): boolean {
    for (const action in $buttonTriggers) {
      if (action !== $recordingAction && recordingKeys === getJoinedModifiers($buttonTriggers[action])) {
        return true;
      }
    }
    return false;
  }
</script>

{#each Object.keys(initial.buttonTriggers) as type}
  <DataTableRow>
    <DataTableCell class="pt-4 pb-4 label">{actionNameToDisplay[type]}</DataTableCell>
    <DataTableCell class="pt-4 pb-4">
      <div class="mb-2">
        <ButtonShortcut {recordingKeys} {isErrorRecording} {record} {stopRecording} {type} />
      </div>
      {#if isErrorRecording && $recordingAction === type}
        <div class="error-text">
          {isAlreadyInUse ? errorMessage.alreadyInUse : errorMessage.youtube}
        </div>
      {/if}
      {#if $recordingAction === type}
        <div class="mt-3">
          <ButtonCancel />
        </div>
      {:else if numpadAliases[getJoinedModifiers($buttonTriggers[type])]}
        <div class="mt-3">
          <Alias {type} />
        </div>
      {/if}
      {#if $recordingAction !== type}
        <ButtonReset {type} />
      {/if}
    </DataTableCell>
  </DataTableRow>
{/each}

<style>
    /*noinspection CssUnusedSymbol*/
  :global(.s-tbl-cell.label) {
    vertical-align: top;
  }
</style>
