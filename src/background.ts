import { Storage } from "@plasmohq/storage";

const storage = {
  local: new Storage({ area: "local" }),
  sync: new Storage({ area: "sync" })
} as const;

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "update" && chrome.runtime.getManifest().version === "2.0.0") {
    await chrome.storage.local.remove("buttonTriggers");
    for (const area in storage) {
      const data = await chrome.storage[area].get();
      const storageInstances = Object.keys(data)
        .filter(key => typeof data[key] !== "string")
        .map(key => storage[area].set(key, data[key]));
      await Promise.all(storageInstances);
    }
    if (process.env.NODE_ENV === "production") {
      await chrome.tabs.create({
        url: `data:text/html;charset=utf-8,%3C%21DOCTYPE%20html%3E%0D%0A%3Chtml%20lang%3D%22en%22%3E%0D%0A%3Chead%3E%0D%0A%20%20%3Cmeta%20charset%3D%22UTF-8%22%3E%0D%0A%20%20%3Ctitle%3EYouTube%20Like-Dislike%20Shortcut%20Updated%3C%2Ftitle%3E%0D%0A%3C%2Fhead%3E%0D%0A%3Cbody%3E%0D%0A%3Ch1%3EYouTube%20Like-Dislike%20Shortcut%20Updated%3C%2Fh1%3E%0D%0A%3Cp%3EChangelog%3C%2Fp%3E%0D%0A%3Col%3E%0D%0A%20%20%3Cli%3EFixed%20the%20extension%3C%2Fli%3E%0D%0A%20%20%3Cli%3ENew%20design%3C%2Fli%3E%0D%0A%20%20%3Cli%3ESupports%20multiple%20non-modifier%20keys%20%28e.g.%20%3Ckbd%3ECtrl%3C%2Fkbd%3E%2B%3Ckbd%3EShift%3C%2Fkbd%3E%2B%3Ckbd%3ES%3C%2Fkbd%3E%2B%3Ckbd%3ED%3C%2Fkbd%3E%29%3C%2Fli%3E%0D%0A%3C%2Fol%3E%0D%0A%3Cstyle%3E%0D%0A%20%20body%20%7B%0D%0A%20%20%20%20font-family%3A%20Arial%2C%20sans-serif%3B%0D%0A%20%20%7D%0D%0A%0D%0A%20%20kbd%3Anot%28%3Afirst-child%29%20%7B%0D%0A%20%20%20%20margin-left%3A%205px%3B%0D%0A%20%20%7D%0D%0A%0D%0A%20%20kbd%3Anot%28%3Alast-child%29%20%7B%0D%0A%20%20%20%20margin-right%3A%205px%3B%0D%0A%20%20%7D%0D%0A%3C%2Fstyle%3E%0D%0A%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E`
      });
    }
  }
});

export {};
