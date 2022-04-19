chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log(`Extension installed: ${reason}`);
  if (reason === "update") {
    chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
  }
});
