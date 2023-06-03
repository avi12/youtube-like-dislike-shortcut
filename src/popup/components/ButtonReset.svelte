<script lang="ts">
  import { mdiRestart } from "@mdi/js";
  import { Button, Icon } from "svelte-materialify";
  import { buttonTriggers } from "../stores";
  import { getJoinedModifiers } from "../utils";
  import type { RecordingType } from "~types";
  import { initial } from "~utils-initials";

  export let type: RecordingType;

  function reset(): void {
    buttonTriggers.update(buttons => ({ ...buttons, [type]: initial.buttonTriggers[type] }));
  }
</script>

<Button
  outlined
  disabled={getJoinedModifiers($buttonTriggers[type]) === getJoinedModifiers(initial.buttonTriggers[type])}
  on:click={reset}
  class="mt-3"
>
  <Icon class="mr-2" path={mdiRestart} />
  Reset
</Button>
