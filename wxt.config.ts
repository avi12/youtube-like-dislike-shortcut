import { readFileSync } from "fs";
import { defineConfig } from "wxt";
import packageJson from "./package.json" with { type: "json" };

function parseGitignoreAsExcludes() {
  return readFileSync(".gitignore", "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#") && !line.startsWith("!"))
    .map(pattern => (pattern.endsWith("/") ? `${pattern}**` : pattern));
}

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
    excludeSources: parseGitignoreAsExcludes(),
    sourcesTemplate: "{{name}}-{{version}}-{{browser}}-source.zip"
  },
  modules: ["@wxt-dev/module-svelte"],
  vite: ({ mode }) => ({
    build: {
      sourcemap: mode === "development" ? "inline" : false
    }
  })
});
