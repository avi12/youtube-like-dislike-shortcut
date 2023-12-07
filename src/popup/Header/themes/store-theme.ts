import { writable } from "svelte/store";

export type ThemeMode = "auto" | "light" | "dark";
export const themeSelected = writable<ThemeMode>("auto");
export const themeCurrent = writable<Exclude<ThemeMode, "auto">>("light");
