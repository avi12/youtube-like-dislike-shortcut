import { mount } from "svelte";

import { initializeKeys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
import { settings } from "@/lib/settings";

import Popup from "./Popup.svelte";

import "./popup.css";

const [buttonTriggers, enabledSurfaces, selectedTheme, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels] =
  await Promise.all([
    settings.buttonTriggers.read(),
    settings.enabledSurfaces.read(),
    settings.theme.read(),
    settings.isAutoLike.read(),
    settings.autoLikeThreshold.read(),
    settings.isAutoLikeSubscribedChannels.read()
  ]);

initializeKeys(buttonTriggers);

const elTarget = document.getElementById("app") ?? document.body;

mount(Popup, {
  target: elTarget,
  props: {
    enabledSurfaces,
    selectedTheme,
    isAutoLike,
    autoLikeThreshold,
    isAutoLikeSubscribedChannels
  }
});
