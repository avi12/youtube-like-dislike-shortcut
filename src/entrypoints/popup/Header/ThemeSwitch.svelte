<script lang="ts">
  import { untrack } from "svelte";
  import { storage } from "#imports";
  import ThemeAuto from "@/entrypoints/popup/Header/themes/ThemeAuto.svelte";
  import ThemeDark from "@/entrypoints/popup/Header/themes/ThemeDark.svelte";
  import ThemeLight from "@/entrypoints/popup/Header/themes/ThemeLight.svelte";
  import { theme, ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";
  import { StorageKey } from "@/lib/utils-initials";

  const CSS_CLASS_QUICK_TRANSITION = "quick-transition";

  interface Props {
    selectedTheme: ThemeMode;
  }
  const { selectedTheme }: Props = $props();

  const instanceDarkTheme = matchMedia("(prefers-color-scheme: dark)");
  const getIsDark = () => instanceDarkTheme.matches;

  function setTheme(themeMode = ThemeMode.auto) {
    const isAutoMode = themeMode === ThemeMode.auto;
    if (isAutoMode) {
      theme.current = getIsDark() ? ThemeMode.dark : ThemeMode.light;
      return;
    }

    theme.current = themeMode;
  }

  untrack(() => {
    theme.selected = selectedTheme;
    setTheme(selectedTheme);
  });

  $effect(() => {
    setTheme(theme.selected);
    storage.setItem(StorageKey.theme, theme.selected);
    document.documentElement.dataset.theme = theme.current;

    const isAutoTheme = theme.selected === ThemeMode.auto;
    if (isAutoTheme) {
      instanceDarkTheme.addEventListener("change", () => {
        const elQuickTransitions = document.querySelectorAll(`.${CSS_CLASS_QUICK_TRANSITION}`);
        for (const elQuickTransition of elQuickTransitions) {
          elQuickTransition.classList.remove(CSS_CLASS_QUICK_TRANSITION);
        }

        setTheme();

        for (const elQuickTransition of elQuickTransitions) {
          elQuickTransition.classList.add(CSS_CLASS_QUICK_TRANSITION);
        }
      });
    }
  });
</script>

<article class="themes">
  <button class:selected={theme.selected === ThemeMode.auto} aria-label="auto theme" aria-pressed={theme.selected === ThemeMode.auto} onclick={() => (theme.selected = ThemeMode.auto)}>
    <ThemeAuto checked={theme.selected === ThemeMode.auto} />
  </button>
  <button class:selected={theme.selected === ThemeMode.light} aria-label="light theme" aria-pressed={theme.selected === ThemeMode.light} onclick={() => (theme.selected = ThemeMode.light)}>
    <ThemeLight checked={theme.selected === ThemeMode.light} />
  </button>
  <button class:selected={theme.selected === ThemeMode.dark} aria-label="dark theme" aria-pressed={theme.selected === ThemeMode.dark} onclick={() => (theme.selected = ThemeMode.dark)}>
    <ThemeDark checked={theme.selected === ThemeMode.dark} />
  </button>
</article>

<style>
  .themes {
    --theme-switcher-button-color-active: var(--md-on-primary-container);
    --theme-switcher-button-color-inactive: var(--md-on-surface-variant);

    display: flex;
    gap: 4px;
    align-items: center;
    padding: 4px;
    border-radius: var(--md-shape-full);
    background-color: var(--md-surface-container);

    & button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: var(--md-shape-large);
      background-color: transparent;
      transition:
        border-radius var(--md-spring-spatial),
        background-color var(--md-spring-effects);

      &:hover:not(.selected) {
        background-color: var(--md-surface-container-high);
      }
    }

    & button.selected {
      border-radius: var(--md-shape-full);
      background-color: var(--md-primary-container);
    }
  }
</style>
