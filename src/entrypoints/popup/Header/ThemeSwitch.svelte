<script lang="ts">
  import { storage } from "#imports";
  import ThemeAuto from "@/entrypoints/popup/Header/themes/ThemeAuto.svelte";
  import ThemeDark from "@/entrypoints/popup/Header/themes/ThemeDark.svelte";
  import ThemeLight from "@/entrypoints/popup/Header/themes/ThemeLight.svelte";
  import { ThemeMode, theme } from "@/entrypoints/popup/Header/themes/theme.svelte.js";

  const instanceDarkTheme = matchMedia("(prefers-color-scheme: dark)");
  const getIsDark = () => instanceDarkTheme.matches;

  function setTheme(pTheme = ThemeMode.auto) {
    if (pTheme === ThemeMode.auto) {
      theme.current = getIsDark() ? ThemeMode.dark : ThemeMode.light;
      return;
    }

    theme.current = pTheme;
  }

  storage.getItem<ThemeMode>("local:theme", { fallback: ThemeMode.auto }).then(pTheme => {
    theme.selected = pTheme;
    setTheme(pTheme);
  });

  $effect(() => {
    setTheme(theme.selected);
    storage.setItem("local:theme", theme.selected);
    document.body.dataset.theme = theme.current;

    if (theme.selected === ThemeMode.auto) {
      instanceDarkTheme.addEventListener("change", () => {
        const elQuickTransitions = document.querySelectorAll(".quick-transition");
        for (const elQuickTransition of elQuickTransitions) {
          elQuickTransition.classList.remove("quick-transition");
        }

        setTheme();

        for (const elQuickTransition of elQuickTransitions) {
          elQuickTransition.classList.add("quick-transition");
        }
      });
    }
  });
</script>

<article class="themes">
  <button class:selected={theme.selected === ThemeMode.auto} onclick={() => (theme.selected = ThemeMode.auto)}>
    <ThemeAuto checked={theme.selected === ThemeMode.auto} />
  </button>
  <button class:selected={theme.selected === ThemeMode.light} onclick={() => (theme.selected = ThemeMode.light)}>
    <ThemeLight checked={theme.selected === ThemeMode.light} />
  </button>
  <button class:selected={theme.selected === ThemeMode.dark} onclick={() => (theme.selected = ThemeMode.dark)}>
    <ThemeDark checked={theme.selected === ThemeMode.dark} />
  </button>
</article>

<style>
  .themes {
    display: flex;
    align-items: center;
    background-color: var(--theme-switcher-bg);
    border-radius: 24px;
    gap: 4px;
    padding: 8px;

    & button {
      border-radius: 50%;
      width: 30px;
      height: 30px;
      border: none;
      background-color: transparent;
      display: flex;
      align-items: center;

      & :global(path),
      & :global(circle) {
        transition:
          fill 0.4s ease-in-out,
          stroke 0.4s ease-in-out;
      }
    }

    & button.selected {
      background-color: var(--theme-switcher-button-bg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .themes button :global(path),
    .themes button :global(circle) {
      transition: none;
    }
  }
</style>
