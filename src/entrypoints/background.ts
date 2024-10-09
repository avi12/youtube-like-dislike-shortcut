import { storage, type StorageArea, type StorageItemKey } from "wxt/storage";

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async () => {
    const storageAreas: Array<StorageArea> = ["local", "sync"];

    for await (const area of storageAreas) {
      const Storage = await chrome.storage[area].get();

      const getValue = (value: string | never) => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      const keyValuePairs: Array<{ key: StorageItemKey; value: any }> = Object.entries(Storage).map(([key, value]) => ({
        key: `${area}:${key}`,
        value: getValue(value)
      }));
      await storage.setItems(keyValuePairs);
    }
  });
});
