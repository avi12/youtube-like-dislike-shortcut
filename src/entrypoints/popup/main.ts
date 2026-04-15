import "./popup.css";
import { storage } from "#imports";
import { mount } from "svelte";
import { ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";
import { initializeKeys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
import { type ButtonTriggers } from "@/lib/types";
import { initial, StorageKey } from "@/lib/utils-initials";
import Popup from "./Popup.svelte";

const [buttonTriggers, selectedTheme, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels] = await Promise.all([
  storage.getItem<ButtonTriggers>(StorageKey.buttonTriggers, { fallback: initial.buttonTriggers }),
  storage.getItem<ThemeMode>(StorageKey.theme, { fallback: ThemeMode.auto }),
  storage.getItem<typeof initial.isAutoLike>(StorageKey.isAutoLike, { fallback: initial.isAutoLike }),
  storage.getItem<typeof initial.autoLikeThreshold>(StorageKey.autoLikeThreshold, { fallback: initial.autoLikeThreshold }),
  storage.getItem<typeof initial.isAutoLikeSubscribedChannels>(StorageKey.isAutoLikeSubscribedChannels, { fallback: initial.isAutoLikeSubscribedChannels })
]);

initializeKeys(buttonTriggers ?? initial.buttonTriggers);

mount(Popup, {
  target: document.getElementById("app") ?? document.body,
  props: {
    selectedTheme: selectedTheme ?? ThemeMode.auto,
    isAutoLike: isAutoLike ?? initial.isAutoLike,
    autoLikeThreshold: autoLikeThreshold ?? initial.autoLikeThreshold,
    isAutoLikeSubscribedChannels: isAutoLikeSubscribedChannels ?? initial.isAutoLikeSubscribedChannels
  }
});
