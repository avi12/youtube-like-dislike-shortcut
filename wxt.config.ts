import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import autoprefixer from "autoprefixer";
import nesting from "postcss-nesting";
import { defineConfig, type UserManifest } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  manifest({ browser, manifestVersion }) {
    const url = process.env.npm_package_repository;
    const [, author, email] = process.env.npm_package_author!.match(/(.+) <(.+)>/)!;
    let manifest: UserManifest = {
      name: "YouTube Like-Dislike Shortcut",
      description: "Shift+Plus or Numpad Plus to like, Shift+Minus or Numpad Minus to dislike. Can't get any simpler.",
      homepage_url: url,
      permissions: ["storage"]
    };
    if (browser === "opera") {
      // @ts-expect-error https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/author
      manifest.author = process.env.npm_package_author;
    } else if (manifestVersion === 3 && browser !== "firefox") {
      manifest.author = { email };
    }
    if (browser === "edge") {
      manifest.name = "Like-Dislike Shortcut for YouTube";
    }
    if (browser === "firefox") {
      manifest = {
        ...manifest,
        browser_specific_settings: {
          gecko: {
            id: "youtube-like-dislike-shortcut@avi12.com"
          }
        },
        developer: {
          name: author,
          url
        }
      };
    } else {
      // if not Firefox
      manifest.offline_enabled = true;
    }
    return manifest;
  },
  outDir: "build",
  outDirTemplate: "{{browser}}-mv{{manifestVersion}}-{{mode}}",
  zip: {
    excludeSources: ["*.env", ".env*"],
    sourcesTemplate: "{{name}}-{{version}}-{{browser}}-source.zip"
  },
  modules: ["@wxt-dev/module-svelte"],
  svelte: {
    vite: {
      preprocess: [
        vitePreprocess({
          script: true,
          style: {
            css: {
              postcss: {
                plugins: [autoprefixer, nesting()]
              }
            }
          }
        })
      ]
    }
  },
  vite: () => ({
    build: {
      sourcemap: "inline"
    }
  })
});
