export enum ThemeMode {
  LIGHT = "light",
  DARK = "dark",
  AUTO = "auto"
}

export const theme = $state<{
  selected: ThemeMode;
  current: Exclude<ThemeMode, ThemeMode.AUTO>;
}>({
  selected: ThemeMode.AUTO,
  current: ThemeMode.LIGHT
});
