<script lang="ts">
  import { Checkbox } from "svelte-materialify";
  import { buttonTriggers, recordingAction } from "../stores";
  import type { ButtonTrigger, SupportedActions } from "../../types";
  import { numpadAliases } from "../mappers";
  import { getJoinedModifiers } from "../utils";

  export let type: SupportedActions;

  function setAlias(e: KeyboardEvent): void {
    const { checked } = e.target as HTMLInputElement;
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
  disabled={$recordingAction !== null && $recordingAction !== type}
  checked={$buttonTriggers[type].secondary}
  on:change={setAlias}
>
  Also use
  {numpadAliases[getJoinedModifiers($buttonTriggers[type])]}
</Checkbox>
