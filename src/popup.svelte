<script lang="ts">
  import { Storage } from "@plasmohq/storage";
  import { DataTable, DataTableBody, MaterialApp } from "svelte-materialify/dist";


  import ButtonCustomization from "./popup/views/ButtonCustomization.svelte";
  import { buttonTriggers, theme } from "~popup/stores";
  import AutoLike from "~popup/views/AutoLike.svelte";
  import type { ButtonTriggers } from "~types";
  import { initial } from "~utils-initials";


  let isAutoLike;
  let autoLikeThreshold;

  const storageSync = new Storage({ area: "sync" });
  const storageLocal = new Storage({ area: "local" });

  Promise.all([
    storageSync.get<typeof initial.isAutoLike>("isAutoLike"),
    storageSync.get<typeof initial.autoLikeThreshold>("autoLikeThreshold"),
    storageLocal.get<ButtonTriggers>("buttonTriggers")
  ]).then(
    ([
      pIsAutoLike = initial.isAutoLike,
      pAutoLikeThreshold = initial.autoLikeThreshold,
      pButtonTriggers = initial.buttonTriggers
    ]) => {
      isAutoLike = pIsAutoLike;
      autoLikeThreshold = pAutoLikeThreshold;
      $buttonTriggers = pButtonTriggers;
    }
  );

  // Apply dark mode if needed
  const instanceDarkMode = matchMedia("(prefers-color-scheme: dark)");
  $theme = instanceDarkMode.matches ? "dark" : "light";
  instanceDarkMode.addEventListener("change", ({ matches }) => {
    $theme = matches ? "dark" : "light";
  });
</script>

<MaterialApp theme={$theme}>
  <h1 class="text-h6 text-center">Shortcut Settings</h1>
  {#if $buttonTriggers}
    <DataTable class="align-start mt-4">
      <DataTableBody>
        <ButtonCustomization />
      </DataTableBody>
    </DataTable>
  {/if}
  {#if isAutoLike !== undefined && autoLikeThreshold !== undefined}
    <AutoLike {isAutoLike} {autoLikeThreshold} />
  {/if}
</MaterialApp>

<style global lang="scss">
  // Chromium browsers
  ::-webkit-scrollbar {
    width: 0;
  }

  // Firefox
  html,
  body {
    scrollbar-width: none;

    // Necessary to not keep any whitespace in the bottom part of the popup
    height: unset !important;
  }

  body {
    overflow: hidden;
    box-sizing: border-box;
    margin: auto;
    width: 400px;
    font-family: Roboto, Arial, sans-serif;
    font-size: 1rem;
    user-select: none;
  }

  // Correcting the line height

  body {
    line-height: 1.2 !important;
  }

  // Other styling

  .s-app {
    text-align: center;
    padding: 7px 16px 10px 16px;
  }

  .s-app .is-auto-like {
    padding-bottom: 0;
  }

  .s-tbl {
    text-align: left;
    display: flex !important;
    border: none !important;
  }

  .s-tbl-row:last-child {
    border-bottom: 1px solid var(--theme-dividers);
  }

  // Making sure the table spans the whole width

  table {
    flex: 1;
  }
</style>
