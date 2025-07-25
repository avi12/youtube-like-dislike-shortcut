import dotenv from "dotenv";
import { defineWebExtConfig } from "wxt";

const path = (() => {
  const osMap: Partial<Record<NodeJS.Platform, string>> = {
    win32: ".env.windows",
    darwin: ".env.mac",
    linux: ".env.linux"
  };
  return osMap[process.platform] || "";
})();

const env = dotenv.configDotenv({ path, quiet: true }).parsed as {
  VITE_PATH_EDGE: string;
  VITE_PATH_OPERA: string;
};

const { VITE_LANG = "en" } = process.env;

export default defineWebExtConfig({
  binaries: {
    edge: env.VITE_PATH_EDGE,
    opera: env.VITE_PATH_OPERA.replace("USERPROFILE", process.env.HOME!)
  },
  disabled: false,
  startUrls: ["https://www.youtube.com/watch?v=aiSla-5xq3w"],
  chromiumArgs: [`--lang=${VITE_LANG}`]
});
