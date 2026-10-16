import type { Plugin } from "vite";
import { readFileSync } from "fs";
import { defineConfig } from "wxt";
import packageJson from "./package.json" with { type: "json" };
import { MusicCommand } from "./src/lib/ytmusic-command";

function parseGitignoreAsExcludes() {
  return readFileSync(".gitignore", "utf-8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#") && !line.startsWith("!"))
    .map(pattern => (pattern.endsWith("/") ? `${pattern}**` : pattern));
}

const url = packageJson.repository;
const [, author, email] = packageJson.author.match(/(.+) <(.+)>/)!;

const sharedPermissions: Browser.runtime.ManifestPermission[] = [
  "storage"
];

function getMinimumVersionChromeOrOpera(browser: string) {
  if (browser === "firefox") {
    return {};
  }

  if (browser === "opera") {
    return { minimum_opera_version: "106.0" };
  }

  return { minimum_chrome_version: "120.0" };
}

const ENTRYPOINT_IMPORTER_ENVIRONMENT = "inline";
const STUBBED_CSS_ID = "\0stubbed-css";

// WXT imports every entrypoint in a bare "inline" Vite environment to read its options, and Vite's CSS
// plugin crashes there on any stylesheet the entrypoint pulls in. Its options never depend on styles
function stubCssWhileImportingEntrypoints(): Plugin {
  return {
    name: "stub-css-while-importing-entrypoints",
    enforce: "pre",
    applyToEnvironment: environment => environment.name === ENTRYPOINT_IMPORTER_ENVIRONMENT,
    resolveId: {
      filter: { id: /\.css(?:\?|$)/ },
      handler: () => STUBBED_CSS_ID
    },
    load(moduleId) {
      if (moduleId !== STUBBED_CSS_ID) {
        return;
      }
      return "export default \"\";";
    }
  };
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  publicDir: "src/public",
  manifest: ({ browser })=> ({
    name: "YouTube Like-Dislike Shortcut",
    description: "Shift+Plus or Numpad Plus to like, Shift+Minus or Numpad Minus to dislike. Can't get any simpler.",
    homepage_url: url,
    permissions: sharedPermissions,
    host_permissions: ["https://www.youtube.com/*"],
    commands: {
      [MusicCommand.like]: {
        description: "Like the YouTube Music song that's playing"
      },
      [MusicCommand.dislike]: {
        description: "Dislike the YouTube Music song that's playing"
      },
      [MusicCommand.unrate]: {
        description: "Unrate the YouTube Music song that's playing"
      }
    },
    author: browser === "opera" || browser === "firefox" ? packageJson.author : { email },
    ...browser !== "firefox" && { offline_enabled: true },
    ...browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "youtube-like-dislike-shortcut@avi12.com",
          strict_min_version: "117.0",
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
    ...getMinimumVersionChromeOrOpera(browser)
  }),
  outDir: "build",
  outDirTemplate: "{{browser}}-mv{{manifestVersion}}-{{mode}}",
  zip: {
    excludeSources: parseGitignoreAsExcludes(),
    artifactTemplate: "{{name}}-{{version}}-{{browser}}.zip",
    sourcesTemplate: "{{name}}-{{version}}-{{browser}}-source.zip"
  },
  modules: ["@wxt-dev/module-svelte"],
  vite: ({ mode }) => ({
    plugins: [stubCssWhileImportingEntrypoints()],
    build: {
      sourcemap: mode === "development" ? "inline" : false
    },
    server: {
      fs: {
        deny: ["user-profiles/**", ".env", ".env.*", "*.{crt,pem}", "**/.git/**"]
      }
    }
  })
});
