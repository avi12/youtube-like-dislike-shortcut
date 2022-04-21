"use strict";

import Popup from "./components/Popup.svelte";
import { getStorage, initial } from "../utils-initials";
import { buttonTriggers, theme } from "./stores";
import { ButtonTriggers } from "../types";

function setDarkMode(): void {
  const instanceDarkMode = matchMedia("(prefers-color-scheme: dark)");
  instanceDarkMode.addEventListener("change", ({ matches }) => {
    theme.set(matches ? "dark" : "light");
  });
  theme.set(instanceDarkMode.matches ? "dark" : "light");
}

async function init(): Promise<void> {
  setDarkMode();
  const buttonTriggersStorage = (await getStorage("local", "buttonTriggers")) ?? initial.buttonTriggers;
  buttonTriggers.set(buttonTriggersStorage as ButtonTriggers);

  new Popup({ target: document.body });
}

init();
