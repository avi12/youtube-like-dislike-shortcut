"use strict";

import { rateVideo } from "./content-script-youtube-rate-buttons";
import type { ButtonTrigger, ButtonTriggers, SupportedActions } from "../types";
import { getStorage, initial } from "../utils-initials";
import {
  getIsPassedThreshold,
  getIsSubscribed,
  prepareToAutoLike,
  setPercentageWatched
} from "./content-script-youtube-rate-auto-like";

declare global {
  interface Window {
    ytrUserInteracted: boolean;
    ytrAutoLikeEnabled: boolean;
    ytrAutoLikeThreshold: number;
    ytrPercentageWatched: number;
    ytrAutoLikeSubscribedChannels: boolean;
  }
}

let gLastTriggers: ButtonTriggers;

async function init(): Promise<void> {
  try {
    gLastTriggers = ((await getStorage("local", "buttonTriggers")) ??
      initial.buttonTriggers) as ButtonTriggers;

    const {
      isAutoLike = initial.isAutoLike,
      isAutoLikeSubscribedChannels = initial.isAutoLikeSubscribedChannels,
      autoLikeThreshold = initial.autoLikeThreshold
    } = await new Promise<{
      isAutoLike: boolean;
      autoLikeThreshold: number;
      isAutoLikeSubscribedChannels: boolean;
    }>(resolve =>
      chrome.storage.sync.get(["isAutoLike", "isAutoLikeSubscribedChannels", "autoLikeThreshold"], resolve)
    );
    window.ytrAutoLikeEnabled = isAutoLike;
    window.ytrAutoLikeThreshold = autoLikeThreshold;
    window.ytrAutoLikeSubscribedChannels = isAutoLikeSubscribedChannels;
  } catch {
    gLastTriggers = initial.buttonTriggers;
    window.ytrAutoLikeEnabled = initial.isAutoLike;
    window.ytrAutoLikeThreshold = initial.autoLikeThreshold;
    window.ytrAutoLikeSubscribedChannels = initial.isAutoLikeSubscribedChannels;
  }

  prepareToAutoLike();
}

init();

chrome.storage.onChanged.addListener(async changes => {
  if ("buttonTriggers" in changes) {
    gLastTriggers = changes.buttonTriggers.newValue;
    return;
  }

  if ("isAutoLike" in changes) {
    window.ytrAutoLikeEnabled = changes.isAutoLike.newValue;
    setPercentageWatched({
      percentage: window.ytrPercentageWatched,
      isVisible: window.ytrAutoLikeEnabled
    });
    if (window.ytrAutoLikeEnabled && getIsPassedThreshold()) {
      rateVideo(true);
    }
    return;
  }

  if ("autoLikeThreshold" in changes) {
    window.ytrAutoLikeThreshold = changes.autoLikeThreshold.newValue;
    if (getIsPassedThreshold()) {
      rateVideo(true);
    }
    return;
  }

  if ("isAutoLikeSubscribedChannels" in changes) {
    window.ytrAutoLikeSubscribedChannels = changes.isAutoLikeSubscribedChannels.newValue;
    if (window.ytrAutoLikeSubscribedChannels && (await getIsSubscribed())) {
      rateVideo(true);
    }
    return;
  }
});

document.addEventListener(
  "keydown",
  e => {
    const isFocusedOnInput =
      document.activeElement.matches("input") ||
      document.activeElement.getAttribute("contenteditable") === "true"; // A comment field

    // We want the shortcut keys to apply only when no text field is focused
    if (isFocusedOnInput) {
      return;
    }

    rateIfNeeded(e);
  },
  { capture: true }
);

function getActionPressed(e: KeyboardEvent): SupportedActions | null {
  for (const actionTypeRaw in gLastTriggers) {
    const actionType = <SupportedActions>actionTypeRaw;
    const action = <ButtonTrigger>gLastTriggers[actionType];
    const isPressedSecondary = e.code !== "" && action.secondary === e.code;
    const isPressedPrimary = action.primary === e.code && action.modifiers.every(modifier => e[modifier]);
    if (isPressedPrimary || isPressedSecondary) {
      return actionType;
    }
  }
  return null;
}

function rateIfNeeded(e: KeyboardEvent): void {
  switch (getActionPressed(e)) {
    case "like":
      e.stopPropagation();
      rateVideo(true);
      break;

    case "dislike":
      e.stopPropagation();
      rateVideo(false);
      break;

    case "unrate":
      e.stopPropagation();
      rateVideo(null);
      break;
  }
}
