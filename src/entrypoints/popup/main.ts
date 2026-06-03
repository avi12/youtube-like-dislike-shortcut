import "./popup.css";
import { storage } from "#imports";
import { mount } from "svelte";
import { ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";
import { initializeKeys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
import { type ButtonTriggers } from "@/lib/types";
import { initial, StorageKey } from "@/lib/utils-initials";
import Popup from "./Popup.svelte";

const { buttonTriggers: defaultButtonTriggers, isAutoLike: defaultIsAutoLike, autoLikeThreshold: defaultAutoLikeThreshold, isAutoLikeSubscribedChannels: defaultIsAutoLikeSubscribedChannels } = initial;

const [buttonTriggers, selectedTheme, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels] = await Promise.all([
  storage.getItem<ButtonTriggers>(StorageKey.buttonTriggers, { fallback: defaultButtonTriggers }),
  storage.getItem<ThemeMode>(StorageKey.theme, { fallback: ThemeMode.auto }),
  storage.getItem<typeof defaultIsAutoLike>(StorageKey.isAutoLike, { fallback: defaultIsAutoLike }),
  storage.getItem<typeof defaultAutoLikeThreshold>(StorageKey.autoLikeThreshold, { fallback: defaultAutoLikeThreshold }),
  storage.getItem<typeof defaultIsAutoLikeSubscribedChannels>(StorageKey.isAutoLikeSubscribedChannels, { fallback: defaultIsAutoLikeSubscribedChannels })
]);

initializeKeys(buttonTriggers ?? defaultButtonTriggers);

mount(Popup, {
  target: document.getElementById("app") ?? document.body,
  props: {
    selectedTheme: selectedTheme ?? ThemeMode.auto,
    isAutoLike: isAutoLike ?? defaultIsAutoLike,
    autoLikeThreshold: autoLikeThreshold ?? defaultAutoLikeThreshold,
    isAutoLikeSubscribedChannels: isAutoLikeSubscribedChannels ?? defaultIsAutoLikeSubscribedChannels
  }
});
