<script lang="ts">
  import { Checkbox } from "svelte-materialify";
  import { numpadAliases } from "../mappers";
  import { buttonTriggers, recordingAction } from "../stores";
  import { getJoinedModifiers } from "../utils";
  import type { ButtonTrigger, SupportedActions } from "~types";

  export let type: SupportedActions;

  function setAlias(e: KeyboardEvent): void {
    const { checked } = <HTMLInputElement>e.target;
    buttonTriggers.update(buttons => ({
      ...buttons,
      [type]: {
        ...buttons[type],
        secondary: checked ? numpadAliases[getJoinedModifiers($buttonTriggers[type])] : ""
      } as ButtonTrigger
    }));
  }
</script>

<Checkbox
  checked={$buttonTriggers[type].secondary}
  disabled={$recordingAction !== null && $recordingAction !== type}
  on:change={setAlias}>
  Also use
  {numpadAliases[getJoinedModifiers($buttonTriggers[type])]}
</Checkbox>
