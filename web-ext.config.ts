import { readdirSync, existsSync, cpSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, resolve } from "node:path";
import { defineWebExtConfig } from "wxt";

const { LANG = "en" } = process.env;
const osPlatform = process.platform;
const home = homedir();

const enum Browser {
  Chrome = "chrome",
  Firefox = "firefox",
  Edge = "edge"
}

const edgeBinaryByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env["ProgramFiles(x86)"]!, "Microsoft/Edge/Application/msedge.exe"),
  darwin: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  linux: "/usr/bin/microsoft-edge"
};

const chromeProfileSourceByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env.LOCALAPPDATA!, "Google", "Chrome", "User Data"),
  darwin: join(home, "Library", "Application Support", "Google", "Chrome"),
  linux: join(home, ".config", "google-chrome")
};

const edgeProfileSourceByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env.LOCALAPPDATA!, "Microsoft", "Edge", "User Data"),
  darwin: join(home, "Library", "Application Support", "Microsoft Edge"),
  linux: join(home, ".config", "microsoft-edge")
};

const firefoxProfilesDirByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env.APPDATA!, "Mozilla/Firefox/Profiles"),
  darwin: join(home, "Library/Application Support/Firefox/Profiles"),
  linux: join(home, ".mozilla/firefox")
};

function findDefaultFirefoxProfile() {
  const profilesDir = firefoxProfilesDirByPlatform[osPlatform];
  if (!profilesDir || !existsSync(profilesDir)) {
    return;
  }
  const profiles = readdirSync(profilesDir);
  const found = profiles.find(dir => dir.endsWith(".default-release")) ?? profiles.find(dir => dir.includes("default")) ?? profiles[0];
  if (found) {
    return join(profilesDir, found);
  }
}

const LOCK_FILES = new Set(["lockfile", "SingletonLock", "SingletonCookie", "SingletonSocket", "LOCK"]);

function getProfileDir(browser: Browser) {
  return resolve(import.meta.dirname, "user-profiles", browser);
}

function copyProfileIfMissing(browser: Browser, source: string | undefined) {
  if (!source || !existsSync(source)) {
    return;
  }
  const dest = getProfileDir(browser);
  if (existsSync(dest)) {
    return;
  }
  console.log(`Copying ${browser} profile from ${source} to ${dest}...`);
  cpSync(source, dest, {
    recursive: true,
    filter: entry => !LOCK_FILES.has(basename(entry))
  });
  console.log("Done.");
}

const isChromeWithProfile = process.env.CHROME_WITH_PROFILE === "1";
const isFirefoxWithProfile = process.env.FIREFOX_WITH_PROFILE === "1";
const isEdgeWithProfile = process.env.EDGE_WITH_PROFILE === "1";

if (isChromeWithProfile) {
  copyProfileIfMissing(Browser.Chrome, chromeProfileSourceByPlatform[osPlatform]);
}
if (isFirefoxWithProfile) {
  copyProfileIfMissing(Browser.Firefox, findDefaultFirefoxProfile());
}
if (isEdgeWithProfile) {
  copyProfileIfMissing(Browser.Edge, edgeProfileSourceByPlatform[osPlatform]);
}

const isAnyChromiumWithProfile = isChromeWithProfile || isEdgeWithProfile;
const chromiumProfileBrowser = isEdgeWithProfile ? Browser.Edge : Browser.Chrome;

export default defineWebExtConfig({
  binaries: {
    edge: edgeBinaryByPlatform[osPlatform] ?? ""
  },
  startUrls: ["https://www.youtube.com/watch?v=aiSla-5xq3w"],
  ...isAnyChromiumWithProfile && {
    keepProfileChanges: true,
    chromiumProfile: getProfileDir(chromiumProfileBrowser)
  },
  firefoxArgs: ["-marionette", "-marionette-port", "2828"],
  ...isFirefoxWithProfile && {
    firefoxProfile: getProfileDir(Browser.Firefox),
    keepProfileChanges: true
  },
  chromiumArgs: [
    `--lang=${LANG}`,
    "--remote-debugging-port=9225",
    "--isolated",
    "--disable-blink-features=AutomationControlled",
    ...[isChromeWithProfile ? "--profile-directory=Profile 1" : ""]
  ]
});
