<script lang="ts">
  import {
    DataTable,
    DataTableBody,
    DataTableCell,
    DataTableRow,
    MaterialApp
  } from "svelte-materialify/dist";
  import Donate from "./Donate.svelte";
  import { theme } from "../stores";
  import ButtonCustomization from "./ButtonCustomization.svelte";
</script>

<MaterialApp theme={$theme}>
  <h1 class="text-h6 text-center">Shortcut Settings</h1>
  <DataTable class="align-start mt-4">
    <DataTableBody>
      <ButtonCustomization />
      <DataTableRow>
        <DataTableCell />
        <DataTableCell class="pt-4 pb-4">
          <Donate />
        </DataTableCell>
      </DataTableRow>
    </DataTableBody>
  </DataTable>
</MaterialApp>

<style>
  /* Chromium browsers */
  :global(::-webkit-scrollbar) {
    width: 0;
  }

  /* Firefox */
  :global(html) {
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

  :global(.extension-popup > body) {
    line-height: 1.2;
  }

  /* Other styling */

  /*noinspection CssUnusedSymbol*/
  :global(.s-app) {
    text-align: center;
    padding: 16px 16px 4px;
  }

  /*noinspection CssUnusedSymbol*/
  :global(.s-tbl) {
    text-align: left;
    display: flex !important;
    border: none !important;
  }

  /* Making sure the table spans the whole width */

  :global(table) {
    flex: 1;
  }
</style>
