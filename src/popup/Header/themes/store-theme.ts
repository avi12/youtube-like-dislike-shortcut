import { writable } from "svelte/store";

export enum ThemeMode {
  light = "light",
  dark = "dark",
  auto = "auto"
}
export const themeSelected = writable<ThemeMode>(ThemeMode.auto);
export const themeCurrent = writable<Exclude<ThemeMode, ThemeMode.auto>>(ThemeMode.light);
