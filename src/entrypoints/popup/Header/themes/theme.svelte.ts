export enum ThemeMode {
  light = "light",
  dark = "dark",
  auto = "auto"
}

export const theme = $state<{
  selected: ThemeMode;
  current: Exclude<ThemeMode, ThemeMode.auto>;
  }>({
    selected: ThemeMode.auto,
    current: ThemeMode.light
  });
