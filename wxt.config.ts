import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import autoprefixer from "autoprefixer";
import nesting from "postcss-nesting";
import { defineConfig, type UserManifest } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  manifest({ browser, manifestVersion }) {
    const url = process.env.npm_package_repository;
    // @ts-expect-error Handling the input correctly
    const [, author, email] = process.env.npm_package_author!.match(/(.+) <(.+)>/);
    let manifest: UserManifest = {
      name: "YouTube Like-Dislike Shortcut",
      description: "Shift+Plus or Numpad Plus to like, Shift+Minus or Numpad Minus to dislike. Can't get any simpler.",
      homepage_url: url,
      permissions: ["storage"],
      options_ui: {
        page: "popup.html",
        browser_style: true
      }
    };
    if (browser === "opera") {
      // @ts-expect-error Two possible values, depending on the browser
      manifest.author = process.env.npm_package_author;
    } else if (manifestVersion === 3) {
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
  zip: {
    excludeSources: ["*.env", ".env*"],
    sourcesTemplate: "{{name}}-{{version}}-{{browser}}-source.zip"
  },
  modules: ["@wxt-dev/module-svelte"],
  svelte: {
    vite: {
      preprocess: [
        vitePreprocess({
          style: {
            // @ts-expect-error Incompatible types
            plugins: [autoprefixer, nesting()]
          }
        })
      ]
    }
  }
});
