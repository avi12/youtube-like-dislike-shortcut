import { defineConfig } from "wxt";
import packageJson from "./package.json" with { type: "json" };

const url = packageJson.repository;
const [, author, email] = packageJson.author.match(/(.+) <(.+)>/)!;

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  publicDir: "src/public",
  manifest: ({ browser })=> ({
    name: browser === "edge" ? "Like-Dislike Shortcut for YouTube" : "YouTube Like-Dislike Shortcut",
    description: "Shift+Plus or Numpad Plus to like, Shift+Minus or Numpad Minus to dislike. Can't get any simpler.",
    homepage_url: url,
    permissions: ["storage"],
    author: browser === "opera" || browser === "firefox" ? packageJson.author : { email },
    ...browser !== "firefox" && { offline_enabled: true },
    ...browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "youtube-like-dislike-shortcut@avi12.com",
          strict_min_version: "82.0",
          data_collection_permissions: {
            required: ["websiteActivity", "websiteContent"],
            optional: ["technicalAndInteraction"]
          }
        }
      },
      developer: {
        name: author,
        url
      }
    },
    minimum_chrome_version: "88.0"
  }),
  outDir: "build",
  outDirTemplate: "{{browser}}-mv{{manifestVersion}}-{{mode}}",
  zip: {
    excludeSources: ["*.env", "build/*"],
    sourcesTemplate: "{{name}}-{{version}}-{{browser}}-source.zip"
  },
  modules: ["@wxt-dev/module-svelte"],
  vite: ({ mode }) => ({
    build: {
      sourcemap: mode === "development" ? "inline" : false
    }
  })
});
