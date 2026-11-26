async ({ pageNames, isSharedAssetChanged }) => {
  const refreshedPages = [];
  for (const view of browser.extension.getViews()) {
    const name = view.location.pathname.replace(/^\//, "").replace(/\.html$/, "");
    if (view === globalThis || (!isSharedAssetChanged && !pageNames.includes(name))) {
      continue;
    }

    view.location.reload();
    refreshedPages.push(name);
  }

  return refreshedPages;
}
