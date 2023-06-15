<script lang="ts">
  import { Button, Icon } from "svelte-materialify";
  import { getJoinedModifiers } from "../utils";
  import { buttonTriggers } from "../stores";
  import type { RecordingType } from "../../types";
  import { initial } from "../../utils-initials";
  import { mdiRestart } from "@mdi/js";

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
