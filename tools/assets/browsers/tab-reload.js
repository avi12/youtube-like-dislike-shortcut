async (patterns) => {
  const tabs = await browser.tabs.query({ url: patterns });
  for (const tab of tabs) {
    await browser.tabs.reload(tab.id);
  }

  return tabs.length;
}
