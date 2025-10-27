import { defineWebExtConfig } from "wxt";

const path = (() => {
  const osMap: Partial<Record<NodeJS.Platform, string>> = {
    win32: ".env.windows",
    darwin: ".env.mac",
    linux: ".env.linux"
  };
  return osMap[process.platform] || "";
})();

process.loadEnvFile(path);

const { VITE_LANG = "en" } = process.env;

export default defineWebExtConfig({
  binaries: {
    edge: process.env.VITE_PATH_EDGE!,
    opera: process.env.VITE_PATH_OPERA!.replace("USERPROFILE", process.env.HOME!)
  },
  disabled: true,
  startUrls: ["https://www.youtube.com/watch?v=aiSla-5xq3w"],
  chromiumArgs: [`--lang=${VITE_LANG}`]
});
