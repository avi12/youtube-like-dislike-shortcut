<script lang="ts">
  import { DataTable, DataTableBody, MaterialApp } from "svelte-materialify/dist";
  import { theme } from "../stores";
  import ButtonCustomization from "./ButtonCustomization.svelte";
  import AutoLike from "./AutoLike.svelte";
  import { initial } from "../../utils-initials";

  export let isAutoLike = initial.isAutoLike;
  export let autoLikeThreshold = initial.autoLikeThreshold;
</script>

<MaterialApp theme={$theme}>
  <h1 class="text-h6 text-center">Shortcut Settings</h1>
  <DataTable class="align-start mt-4">
    <DataTableBody>
      <ButtonCustomization />
    </DataTableBody>
  </DataTable>
  <AutoLike {isAutoLike} {autoLikeThreshold} />
</MaterialApp>

<style>
  /* Chromium browsers */
  :global(::-webkit-scrollbar) {
    width: 0;
  }

  /* Firefox */
  :global(html, body) {
    /*noinspection CssUnknownProperty*/
    scrollbar-width: none;

    /* Necessary to not keep any whitespace in the bottom part of the popup */
    height: unset !important;
  }

  :global(body) {
    overflow: hidden;
    box-sizing: border-box;
    margin: auto;
    width: 400px;
    font-family: Roboto, Arial, sans-serif;
    font-size: 1rem;
  }

  /* Correcting the line height */

  :global(body) {
    line-height: 1.2 !important;
  }

  /* Other styling */

  /*noinspection CssUnusedSymbol*/
  :global(.s-app) {
    text-align: center;
    padding: 16px;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.s-app .is-auto-like) {
    padding-bottom: 0;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.s-tbl) {
    text-align: left;
    display: flex !important;
    border: none !important;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.s-tbl-row:last-child) {
    /*noinspection CssUnresolvedCustomProperty*/
    border-bottom: 1px solid var(--theme-dividers);
  }

  /* Making sure the table spans the whole width */

  :global(table) {
    flex: 1;
  }
</style>
