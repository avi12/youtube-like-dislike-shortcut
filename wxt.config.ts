import { defineConfig } from "wxt";
import packageJson from "./package.json" assert { type: "json" };

const url = packageJson.repository;
const [, author, email] = packageJson.author.match(/(.+) <(.+)>/)!;

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  publicDir: "src/public",
  manifest: ({ browser })=> ({
    name: "YouTube Like-Dislike Shortcut",
    description: "Shift+Plus or Numpad Plus to like, Shift+Minus or Numpad Minus to dislike. Can't get any simpler.",
    homepage_url: url,
    permissions: ["storage"],
    author: browser === "opera" || browser === "firefox" ? packageJson.author : { email },
    ...browser !== "firefox" && { offline_enabled: true },
    ...browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "youtube-like-dislike-shortcut@avi12.com"
        }
      },
      developer: {
        name: author,
        url
      }
    }
  }),
  outDir: "build",
  outDirTemplate: "{{browser}}-mv{{manifestVersion}}-{{mode}}",
  zip: {
    excludeSources: ["*.env", ".env*", "build/*"],
    sourcesTemplate: "{{name}}-{{version}}-{{browser}}-source.zip"
  },
  modules: ["@wxt-dev/module-svelte"],
  vite: () => ({
    build: {
      sourcemap: "inline"
    }
  })
});
