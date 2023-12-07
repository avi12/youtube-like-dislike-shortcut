<script lang="ts">
  import { Storage } from "@plasmohq/storage";
  import ThemeAuto from "~popup/Header/themes/ThemeAuto.svelte";
  import ThemeDark from "~popup/Header/themes/ThemeDark.svelte";
  import ThemeLight from "~popup/Header/themes/ThemeLight.svelte";
  import { themeCurrent, type ThemeMode, themeSelected } from "~popup/Header/themes/store-theme";

  const instanceDarkTheme = matchMedia("(prefers-color-scheme: dark)");
  const getIsDark = () => instanceDarkTheme.matches;

  const storageLocal = new Storage({ area: "local" });

  function setTheme(theme: ThemeMode = "auto") {
    if (theme === "auto") {
      $themeCurrent = getIsDark() ? "dark" : "light";
      return;
    }

    $themeCurrent = theme;
  }

  storageLocal.get("theme").then((theme: ThemeMode = "auto") => {
    $themeSelected = theme;
    setTheme(theme);
  });

  $: {
    setTheme($themeSelected);
    storageLocal.set("theme", $themeSelected);
    document.body.dataset.theme = $themeCurrent;

    if ($themeSelected === "auto") {
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
  }
</script>

<article class="themes">
  <button class:button--selected={$themeSelected === "auto"} on:click={() => ($themeSelected = "auto")}>
    <ThemeAuto checked={$themeSelected === "auto"} />
  </button>
  <button class:button--selected={$themeSelected === "light"} on:click={() => ($themeSelected = "light")}>
    <ThemeLight checked={$themeSelected === "light"} />
  </button>
  <button class:button--selected={$themeSelected === "dark"} on:click={() => ($themeSelected = "dark")}>
    <ThemeDark checked={$themeSelected === "dark"} />
  </button>
</article>

<style lang="scss">
  .themes {
    display: flex;
    align-items: center;
    background-color: var(--theme-switcher-bg);
    border-radius: 24px;
    gap: 4px;
    padding: 8px;

    button {
      border-radius: 50%;
      width: 30px;
      height: 30px;
      border: none;
      background-color: transparent;
      display: flex;
      align-items: center;

      :global(path),
      :global(circle) {
        transition:
          fill 0.4s ease-in-out,
          stroke 0.4s ease-in-out;
      }

      &.button--selected {
        background-color: var(--theme-switcher-button-bg);
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .themes {
      button {
        :global(path),
        :global(circle) {
          transition: none;
        }
      }
    }
  }
</style>
