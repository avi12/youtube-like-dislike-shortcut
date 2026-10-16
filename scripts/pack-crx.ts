/**
 * Packs the Chrome production build into a signed .crx for GitHub releases. The private key lives in the
 * gitignored keys/ folder and is created on the first run - keep it, since it fixes the extension ID
 */

import writeCrx3File from "crx3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const CHROME_BUILD_DIR = resolve(PROJECT_ROOT, "build/chrome-mv3-prod");
const PRIVATE_KEY_PATH = resolve(PROJECT_ROOT, "keys/chrome.pem");

const { name, version } = JSON.parse(readFileSync(resolve(PROJECT_ROOT, "package.json"), "utf-8"));
const crxPath = resolve(PROJECT_ROOT, `build/${name}-${version}-chrome.crx`);

mkdirSync(dirname(PRIVATE_KEY_PATH), { recursive: true });
await writeCrx3File([CHROME_BUILD_DIR], {
  keyPath: PRIVATE_KEY_PATH,
  crxPath
});
console.log(`Packed ${crxPath}`);
