import Popup from "./components/Popup.svelte";
import { getStorage } from "../utils-initials";

async function init(): Promise<void> {
  new Popup({
    target: document.body,
    props: { buttonTriggers: await getStorage("local", "buttonTriggers") }
  });
}

init();
