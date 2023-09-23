<script lang="ts">
  import { DataTable, DataTableBody, MaterialApp } from "svelte-materialify/dist";
  import { theme } from "../stores";
  import ButtonCustomization from "./ButtonCustomization.svelte";
  import AutoLike from "./AutoLike.svelte";
  import { initial } from "../../utils-initials";

  export let isAutoLike = initial.isAutoLike;
  export let isAutoLikeSubscribedChannels = initial.isAutoLikeSubscribedChannels;
  export let autoLikeThreshold = initial.autoLikeThreshold;
</script>

<MaterialApp theme={$theme}>
  <DataTable class="align-start mt-4">
    <DataTableBody>
      <ButtonCustomization />
    </DataTableBody>
  </DataTable>
  <AutoLike {isAutoLike} {isAutoLikeSubscribedChannels} {autoLikeThreshold} />
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
    // Correcting the line height
    line-height: 1.2 !important;
  }

  // Other styling

  .s-app {
    text-align: center;
    padding: 4px 16px 16px;
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
