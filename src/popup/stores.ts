"use strict";

import { writable } from "svelte/store";
import type { ButtonTriggers, RecordingType } from "~types";

export const theme = writable<"light" | "dark">();

export const buttonTriggers = writable<ButtonTriggers>();

export const recordingAction = writable<RecordingType>(null);
