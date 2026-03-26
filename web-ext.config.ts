import { readdirSync, existsSync, cpSync } from "node:fs";
import { homedir, platform } from "node:os";
import { resolve, join, basename } from "node:path";
import { defineWebExtConfig } from "wxt";

const { LANG = "en" } = process.env;

const edgeByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  darwin: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  linux: "/usr/bin/microsoft-edge-stable"
};

const operaByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(homedir(), "AppData/Local/Programs/Opera/opera.exe"),
  darwin: "/Applications/Opera.app/Contents/MacOS/Opera",
  linux: "/usr/bin/opera"
};

function findDefaultFirefoxProfile() {
  const profilesDir = (() => {
    const home = homedir();
    if (platform() === "win32") {
      return join(home, "AppData/Roaming/Mozilla/Firefox/Profiles");
    }
    if (platform() === "darwin") {
      return join(home, "Library/Application Support/Firefox/Profiles");
    }
    return join(home, ".mozilla/firefox");
  })();
  if (!existsSync(profilesDir)) {
    return undefined;
  }
  const profiles = readdirSync(profilesDir);
  const found = profiles.find(dir => dir.endsWith(".default-release")) ?? profiles.find(dir => dir.includes("default")) ?? profiles[0];
  return found ? join(profilesDir, found) : undefined;
}

const LOCK_FILES = new Set(["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket", "LOCK"]);

function setupChromeProfile() {
  const chromeSrcByPlatform: Partial<Record<NodeJS.Platform, string>> = {
    win32: join(process.env.LOCALAPPDATA!, "Google", "Chrome", "User Data"),
    darwin: join(homedir(), "Library", "Application Support", "Google", "Chrome"),
    linux: join(homedir(), ".config", "google-chrome")
  };
  const src = chromeSrcByPlatform[process.platform];
  if (!src || !existsSync(src)) {
    return;
  }

  const dest = resolve(import.meta.dirname, "../User Data");
  if (existsSync(dest)) {
    return;
  }

  console.log(`Copying Chrome profile from ${src} to ${dest}...`);
  cpSync(src, dest, { recursive: true, filter: src => !LOCK_FILES.has(basename(src)) });
  console.log("Done.");
}

if (process.env.CHROME_WITH_PROFILE === "1") {
  setupChromeProfile();
}

export default defineWebExtConfig({
  binaries: {
    edge: edgeByPlatform[process.platform]!,
    opera: operaByPlatform[process.platform]!
  },
  startUrls: ["https://www.youtube.com/watch?v=aiSla-5xq3w"],
  ...process.env.CHROME_WITH_PROFILE === "1" && {
    keepProfileChanges: true,
    chromiumProfile: resolve(import.meta.dirname, "../User Data")
  },
  firefoxArgs: ["-marionette", "-marionette-port", "2828"],
  ...process.env.FIREFOX_WITH_PROFILE === "1" && {
    firefoxProfile: findDefaultFirefoxProfile(),
    keepProfileChanges: true
  },
  chromiumArgs: [
    `--lang=${LANG}`,
    "--remote-debugging-port=9225",
    "--isolated",
    "--disable-blink-features=AutomationControlled",
    ...[process.env.CHROME_WITH_PROFILE === "1" ? "--profile-directory=Profile 1" : ""]
  ]
});
