<script lang="ts">
import ThemeSwitch from "~popup/Header/ThemeSwitch.svelte";
</script>

<header>
  <h1>Like/Dislike Shortcut</h1>
  <ThemeSwitch></ThemeSwitch>
</header>

<style lang="scss">
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
