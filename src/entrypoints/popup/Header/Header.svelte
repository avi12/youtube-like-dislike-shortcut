<script lang="ts">
  import ThemeSwitch from "@/entrypoints/popup/Header/ThemeSwitch.svelte";
</script>

<header>
  <h1>Like/Dislike Shortcut</h1>
  <ThemeSwitch></ThemeSwitch>
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
