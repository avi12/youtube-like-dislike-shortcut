import { ThemeMode } from "@/lib/theme-mode";

export const theme = $state<{
  selected: ThemeMode;
  current: Exclude<ThemeMode, ThemeMode.AUTO>;
}>({
  selected: ThemeMode.AUTO,
  current: ThemeMode.LIGHT
});
