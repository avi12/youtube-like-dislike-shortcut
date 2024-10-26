<script lang="ts">
  import { storage } from "wxt/storage";
  import ThemeAuto from "@/entrypoints/popup/Header/themes/ThemeAuto.svelte";
  import ThemeDark from "@/entrypoints/popup/Header/themes/ThemeDark.svelte";
  import ThemeLight from "@/entrypoints/popup/Header/themes/ThemeLight.svelte";
  import { themeCurrent, ThemeMode, themeSelected } from "@/entrypoints/popup/Header/themes/store-theme";

  const instanceDarkTheme = matchMedia("(prefers-color-scheme: dark)");
  const getIsDark = () => instanceDarkTheme.matches;

  function setTheme(theme = ThemeMode.auto) {
    if (theme === ThemeMode.auto) {
      $themeCurrent = getIsDark() ? ThemeMode.dark : ThemeMode.light;
      return;
    }

    $themeCurrent = theme;
  }

  storage.getItem<ThemeMode>("local:theme", { fallback: ThemeMode.auto }).then(theme => {
    $themeSelected = theme;
    setTheme(theme);
  });

  $effect(() => {
    setTheme($themeSelected);
    storage.setItem("local:theme", $themeSelected);
    document.body.dataset.theme = $themeCurrent;

    if ($themeSelected === ThemeMode.auto) {
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
  <button class:selected={$themeSelected === ThemeMode.auto} onclick={() => ($themeSelected = ThemeMode.auto)}>
    <ThemeAuto checked={$themeSelected === ThemeMode.auto} />
  </button>
  <button class:selected={$themeSelected === ThemeMode.light} onclick={() => ($themeSelected = ThemeMode.light)}>
    <ThemeLight checked={$themeSelected === ThemeMode.light} />
  </button>
  <button class:selected={$themeSelected === ThemeMode.dark} onclick={() => ($themeSelected = ThemeMode.dark)}>
    <ThemeDark checked={$themeSelected === ThemeMode.dark} />
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
