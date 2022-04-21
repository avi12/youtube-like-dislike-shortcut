<script type="ts">
  import { Button } from "svelte-materialify";
  import { buttonTriggers, recordingAction, theme } from "../stores";
  import { RecordingType } from "../../types";
  import { getJoinedModifiers } from "../utils";

  function toggleRecording(): void {
    // Scenarios:
    // - first time user clicks to record a keystroke
    if (!$recordingAction) {
      record();
      $recordingAction = type;
      return;
    }

    // - user clicks to stop recording the same type
    if ($recordingAction === type) {
      if (!isErrorRecording) {
        stopRecording();
      }
      $recordingAction = null;
      return;
    }
  }

  export let isErrorRecording = false;
  export let recordingKeys = "";
  export let record;
  export let stopRecording;
  export let type: RecordingType;

  $: colorActiveButton = isErrorRecording ? "error-color" : "secondary-color";
</script>

<Button
  outlined={$theme === "dark"}
  class={"text-none " + ($recordingAction === type ? colorActiveButton : "")}
  disabled={$recordingAction !== null && $recordingAction !== type}
  on:click={toggleRecording}
>
  {#if $recordingAction === type}
    {recordingKeys || getJoinedModifiers($buttonTriggers[type])}
  {:else}
    {getJoinedModifiers($buttonTriggers[type])}
  {/if}
</Button>

<style>
  /*noinspection CssUnusedSymbol*/
  :global(.text-none.text-none .s-btn__content) {
    text-transform: none;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.s-btn.text-none) {
    white-space: normal;
    display: block;
    height: unset !important;
    padding: 10px !important;
  }
</style>
