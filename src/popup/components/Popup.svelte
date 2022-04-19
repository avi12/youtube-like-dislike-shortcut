<script lang="ts">
  import {
    Button,
    Checkbox,
    DataTable,
    DataTableBody,
    DataTableCell,
    DataTableRow,
    Icon,
    MaterialApp
  } from "svelte-materialify/dist";
  import { mdiClose, mdiHeart, mdiRestart } from "@mdi/js";
  import type { ButtonTrigger, ButtonTriggers, Modifier, RecordingType, SupportedActions } from "../../types";
  import { initial } from "../../utils-initials";

  class KeyRecorder {
    keysSet: Set<string>;
    #modifierKeys: Modifier[];
    #nonModifierKeys: string[];
    isAlreadyInUse: boolean;

    record(): void {
      isErrorRecording = false;
      this.stop();
      this.keysSet = new Set<string>();
      this.#modifierKeys = [];
      this.#nonModifierKeys = [];
      document.addEventListener("keydown", this.onKeyDown.bind(this));
    }

    stop(): void {
      document.removeEventListener("keydown", this.onKeyDown.bind(this));
      if (this.#modifierKeys?.length && this.#nonModifierKeys?.length) {
        buttonTriggers = { ...buttonTriggers, [recordingAction]: this.getButtonTriggers() };
      }
      recordingKeys = "";
    }

    onKeyDown(e: KeyboardEvent): void {
      this.keysSet.add(e.code);
      this.setKeys();
      if (this.#nonModifierKeys.length > 1) {
        for (let i = 0; i < this.#nonModifierKeys.length - 1; i++) {
          const nonModifierKey = this.#nonModifierKeys[i];
          this.keysSet.delete(nonModifierKey);
        }
      }
      this.setKeys();
      const modifiers = new Set(this.#modifierKeys.map(modifier => modifierToKeyDisplay[modifier]));
      recordingKeys = [...modifiers, ...this.#nonModifierKeys].join(" + ");

      this.isAlreadyInUse = this.getIsAlreadyInUse();
      isErrorRecording = Boolean(buttonTriggersYouTube[recordingKeys] || this.isAlreadyInUse);
    }

    private setKeys(): void {
      const keys = [...this.keysSet];
      this.#modifierKeys = keys.filter(key => modifierToKeyButton[key]).map(key => modifierToKeyButton[key]);
      this.#nonModifierKeys = keys.filter(key => !modifierToKeyButton[key]);
    }

    private getIsAlreadyInUse(): boolean {
      for (const action in buttonTriggers) {
        if (action !== recordingAction && recordingKeys === getJoinedModifiers(buttonTriggers[action])) {
          return true;
        }
      }
      return false;
    }

    getButtonTriggers(): ButtonTrigger {
      const lastKey = this.#nonModifierKeys[this.#nonModifierKeys.length - 1];
      return {
        primary: lastKey,
        modifiers: this.#modifierKeys,
        secondary:
          numpadAliases[
            `${this.#modifierKeys.map(key => modifierToKeyDisplay[key]).join(" + ")} + ${lastKey}`
            ]
      };
    }
  }

  const keystrokeRecorder = new KeyRecorder();

  export let buttonTriggers: ButtonTriggers = initial.buttonTriggers;

  const metaKey = navigator.userAgent.includes("Windows") ? "Windows" : "Command";

  const modifierToKeyDisplay = {
    shiftKey: "Shift",
    ctrlKey: "Ctrl",
    altKey: "Alt",
    metaKey
  } as const;

  const modifierToKeyButton = {
    ShiftLeft: "shiftKey",
    ShiftRight: "shiftKey",
    ControlLeft: "ctrlKey",
    ControlRight: "ctrlKey",
    AltLeft: "altKey",
    AltRight: "altKey",
    MetaLeft: "metaKey",
    MetaRight: "metaKey"
  } as const;

  const numpadAliases = {
    "Shift + Equal": "NumpadAdd",
    "Shift + Minus": "NumpadSubtract",
    "Shift + Slash": "NumpadDivide",
    "Shift + Digit8": "NumpadMultiply",
    "Shift + Period": "NumpadDecimal"
  } as const;

  // The values are only for the code readers to understand what the buttons are doing
  const buttonTriggersYouTube = {
    KeyK: "Play",
    KeyJ: "Rewind",
    KeyL: "Forward",
    "Shift + KeyP": "Previous video",
    "Shift + KeyN": "Next video",
    Comma: "Previous frame",
    Period: "Next frame",
    "Ctrl + ArrowLeft": "Previous chapter",
    "Ctrl + ArrowRight": "Next chapter",
    KeyF: "Fullscreen",
    KeyT: "Theater",
    KeyM: "Mute",
    ArrowUp: "Volume up",
    ArrowDown: "Volume down",
    KeyI: "Mini-player",
    KeyC: "CC",
    KeyO: "Text opacity",
    KeyW: "Window opacity",
    Equal: "Increase CC",
    Minus: "Decrease CC"
  } as const;

  const actionNameMapper = {
    like: "Like",
    dislike: "Dislike",
    unrate: "Un-rate"
  } as const;

  function getJoinedModifiers(trigger: ButtonTrigger): string {
    return [...trigger.modifiers.map(modifier => modifierToKeyDisplay[modifier]), trigger.primary].join(
      " + "
    );
  }

  let recordingKeys = "";

  let isErrorRecording = false;

  const errorMessage = {
    youtube: "Cannot assign. Used by YouTube",
    alreadyInUse: "Cannot assign. Already in use"
  };
  $: colorActiveButton = isErrorRecording ? "error-color" : "secondary-color";

  $: {
    chrome.storage.local.set({ buttonTriggers });
  }

  let recordingAction: RecordingType = null;

  function toggleRecording(type: RecordingType): void {
    // Scenarios:
    // - first time user clicks to record a keystroke
    if (!recordingAction) {
      keystrokeRecorder.record();
      recordingAction = type;
      return;
    }

    // - user clicks to record a keystroke of a different type
    if (recordingAction !== type) {
      keystrokeRecorder.record();
      recordingAction = type;
      return;
    }

    // - user clicks to stop recording the same type
    if (recordingAction === type) {
      if (!isErrorRecording) {
        keystrokeRecorder.stop();
      }
      recordingAction = null;
      return;
    }
  }

  function reset(type: SupportedActions): void {
    buttonTriggers = { ...buttonTriggers, [type]: initial.buttonTriggers[type] };
  }

  function setAlias(e: KeyboardEvent, type: SupportedActions) {
    const { checked } = <HTMLInputElement>e.target;
    buttonTriggers = {
      ...buttonTriggers,
      [type]: {
        ...buttonTriggers[type],
        secondary: checked ? numpadAliases[getJoinedModifiers(buttonTriggers[type])] : ""
      } as ButtonTrigger
    };
  }

  const instanceMatchMedia = matchMedia("(prefers-color-scheme: dark)");
  let theme: "dark" | "light" = instanceMatchMedia.matches ? "dark" : "light";
  instanceMatchMedia.addEventListener("change", ({ matches }) => (theme = matches ? "dark" : "light"));
</script>

<MaterialApp {theme}>
  <h1 class="text-h6 text-center">Shortcut Settings</h1>
  <DataTable class="align-start mt-4">
    <DataTableBody>
      {#each Object.keys(initial.buttonTriggers) as type}
        <DataTableRow>
          <DataTableCell class="pt-4 pb-4 label">{actionNameMapper[type]}</DataTableCell>
          <DataTableCell class="pt-4 pb-4">
            <div class="mb-2">
              <Button outlined={theme === "dark"}
                      class={"text-none " + (recordingAction === type ? colorActiveButton : "")}
                      disabled={recordingAction !== null && recordingAction !== type}
                      on:click={() => toggleRecording(type)}>
                {#if recordingAction === type}
                  {recordingKeys || getJoinedModifiers(buttonTriggers[type])}
                {:else}
                  {getJoinedModifiers(buttonTriggers[type])}
                {/if}
              </Button>
            </div>
            {#if isErrorRecording && recordingAction === type}
              <div class="error-text">
                {keystrokeRecorder.isAlreadyInUse ? errorMessage.alreadyInUse : errorMessage.youtube}
              </div>
            {/if}
            {#if recordingAction === type}
              <div class="mt-3">
                <Button outlined on:click={() => (recordingAction = null)}>
                  <Icon class="mr-2" path={mdiClose} />
                  Cancel
                </Button>
              </div>
            {:else if numpadAliases[getJoinedModifiers(buttonTriggers[type])]}
              <div class="mt-3">
                <Checkbox disabled={recordingAction !== null && recordingAction !== type}
                          checked={buttonTriggers[type].secondary}
                          on:change={e => setAlias(e, type)}>
                  Also use
                  {numpadAliases[getJoinedModifiers(buttonTriggers[type])]}
                </Checkbox>
              </div>
            {/if}
            {#if recordingAction !== type}
              <Button outlined disabled={getJoinedModifiers(buttonTriggers[type]) ===
                  getJoinedModifiers(initial.buttonTriggers[type])} on:click={() => reset(type)} class="mt-3">
                <Icon class="mr-2" path={mdiRestart} />
                Reset
              </Button>
            {/if}
          </DataTableCell>
        </DataTableRow>
      {/each}
      <DataTableRow>
        <DataTableCell />
        <DataTableCell class="pt-4 pb-4">
          <Button outlined={theme === "dark"} on:click={() => chrome.tabs.create({ url: "https://paypal.me/avi12" })}>
            <Icon class="mr-2" path={mdiHeart} />
            Donate
          </Button>
        </DataTableCell>
      </DataTableRow>
    </DataTableBody>
  </DataTable>
</MaterialApp>

<style>
    /* Chromium browsers */
    :global(::-webkit-scrollbar) {
        width: 0;
    }

    /* Firefox */
    :global(html) {
        /*noinspection CssUnknownProperty*/
        scrollbar-width: none;

        /* Necessary to not keep any whitespace in the bottom part of the popup */
        height: unset !important;
    }

    :global(body) {
        overflow: hidden;
        box-sizing: border-box;
        margin: auto;
        width: 400px;
        font-family: Roboto, Arial, sans-serif;
        font-size: 1rem;
    }

    /* Correcting the line height */

    :global(.extension-popup > body) {
        line-height: 1.2;
    }

    :global(.text-none.text-none .s-btn__content) {
        text-transform: none;
    }

    :global(.s-app) {
        text-align: center;
        padding: 16px 16px 4px;
    }

    :global(.s-tbl) {
        text-align: left;
        display: flex !important;
        border: none !important;
    }

    :global(.s-btn.text-none) {
        white-space: normal;
        display: block;
        height: unset !important;
        padding: 10px !important;
    }

    :global(.s-tbl-cell.label) {
        vertical-align: top;
    }
</style>
