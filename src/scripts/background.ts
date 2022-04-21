chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "update") {
    chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
  }
});
