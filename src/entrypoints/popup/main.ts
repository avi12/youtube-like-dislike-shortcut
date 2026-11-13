import { mount } from "svelte";

import { storage } from "#imports";
import { ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";
import { initializeKeys } from "@/entrypoints/popup/sections/keyboard.svelte.js";
import { type EnabledSurfaces, resolveEnabledSurfaces } from "@/lib/surfaces";
import { type ButtonTriggers } from "@/lib/types";
import { initial, StorageKey } from "@/lib/utils-initials";

import Popup from "./Popup.svelte";

import "./popup.css";

const {
  buttonTriggers: defaultButtonTriggers,
  isAutoLike: defaultIsAutoLike,
  autoLikeThreshold: defaultAutoLikeThreshold,
  isAutoLikeSubscribedChannels: defaultIsAutoLikeSubscribedChannels
} = initial;

const [buttonTriggers, enabledSurfaces, selectedTheme, isAutoLike, autoLikeThreshold, isAutoLikeSubscribedChannels] =
  await Promise.all([
    storage.getItem<ButtonTriggers>(StorageKey.BUTTON_TRIGGERS, { fallback: defaultButtonTriggers }),
    storage.getItem<Partial<EnabledSurfaces>>(StorageKey.ENABLED_SURFACES),
    storage.getItem<ThemeMode>(StorageKey.THEME, { fallback: ThemeMode.AUTO }),
    storage.getItem<typeof defaultIsAutoLike>(StorageKey.IS_AUTO_LIKE, { fallback: defaultIsAutoLike }),
    storage.getItem<typeof defaultAutoLikeThreshold>(StorageKey.AUTO_LIKE_THRESHOLD, {
      fallback: defaultAutoLikeThreshold
    }),
    storage.getItem<typeof defaultIsAutoLikeSubscribedChannels>(StorageKey.IS_AUTO_LIKE_SUBSCRIBED_CHANNELS, {
      fallback: defaultIsAutoLikeSubscribedChannels
    })
  ]);

initializeKeys(buttonTriggers ?? defaultButtonTriggers);

const elTarget = document.getElementById("app") ?? document.body;

mount(Popup, {
  target: elTarget,
  props: {
    enabledSurfaces: resolveEnabledSurfaces(enabledSurfaces),
    selectedTheme: selectedTheme ?? ThemeMode.AUTO,
    isAutoLike: isAutoLike ?? defaultIsAutoLike,
    autoLikeThreshold: autoLikeThreshold ?? defaultAutoLikeThreshold,
    isAutoLikeSubscribedChannels: isAutoLikeSubscribedChannels ?? defaultIsAutoLikeSubscribedChannels
  }
});
