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
  Opera = "opera"
}

const operaBinaryByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env.LOCALAPPDATA!, "Programs/Opera/opera.exe"),
  darwin: "/Applications/Opera.app/Contents/MacOS/Opera",
  linux: "/usr/bin/opera"
};

const chromeProfileSourceByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env.LOCALAPPDATA!, "Google", "Chrome", "User Data"),
  darwin: join(home, "Library", "Application Support", "Google", "Chrome"),
  linux: join(home, ".config", "google-chrome")
};

const operaProfileSourceByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env.APPDATA!, "Opera Software", "Opera Stable"),
  darwin: join(home, "Library", "Application Support", "com.operasoftware.Opera"),
  linux: join(home, ".config", "opera")
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
const isOperaWithProfile = process.env.OPERA_WITH_PROFILE === "1";

if (isChromeWithProfile) {
  copyProfileIfMissing(Browser.Chrome, chromeProfileSourceByPlatform[osPlatform]);
}
if (isFirefoxWithProfile) {
  copyProfileIfMissing(Browser.Firefox, findDefaultFirefoxProfile());
}
if (isOperaWithProfile) {
  copyProfileIfMissing(Browser.Opera, operaProfileSourceByPlatform[osPlatform]);
}

const isAnyChromiumWithProfile = isChromeWithProfile || isOperaWithProfile;
const chromiumProfileBrowser = isOperaWithProfile ? Browser.Opera : Browser.Chrome;

export default defineWebExtConfig({
  binaries: {
    opera: operaBinaryByPlatform[osPlatform] ?? ""
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
