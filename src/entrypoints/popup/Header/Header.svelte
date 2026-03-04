<script lang="ts">
  import { storage } from "#imports";
  import ThemeSwitch from "@/entrypoints/popup/Header/ThemeSwitch.svelte";
  import { ThemeMode } from "@/entrypoints/popup/Header/themes/theme.svelte.js";

  const themePromise = storage.getItem<ThemeMode>("local:theme", { fallback: ThemeMode.auto });
</script>

<header>
  <h1>Like/Dislike Shortcut</h1>
  {#await themePromise then selectedTheme}
    <ThemeSwitch {selectedTheme} />
  {/await}
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 400;
  }
</style>
