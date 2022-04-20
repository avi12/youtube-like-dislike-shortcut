<script>
  import { Button, Icon } from "svelte-materialify";
  import { mdiClose } from "@mdi/js";
  import { recordingAction } from "../stores";
</script>

<Button outlined on:click={() => ($recordingAction = null)}>
  <Icon class="mr-2" path={mdiClose} />
  Cancel
</Button>
