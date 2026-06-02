/**
 * Dev server: production build (with source maps via wxt mode=development) + browser
 * with sideloaded extension. On every file change under src/ or wxt.config.ts:
 *   1. Full wxt build (no incremental, no stale transitive imports)
 *   2. Reload the extension in the browser
 *   3. Reload every YouTube tab via CDP (except tabs hosting cross-origin iframes,
 *      which would lose their state — we reload only top-level YouTube pages)
 *
 * Usage:
 *   pnpm dev                       - Edge (default)
 *   pnpm dev --browser chrome      - Chrome
 *   pnpm dev --browser firefox     - Firefox MV3
 *   pnpm dev --browser opera       - Opera
 *
 * Pass --with-profile to copy the user's real browser profile on first run
 * (matches the existing dev:*:with-profile scripts via web-ext.config.ts).
 */

import chokidar from "chokidar";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { resolve, join } from "node:path";
import webExtRun from "web-ext-run";
import { consoleStream as webExtConsoleStream } from "web-ext-run/util/logger";

type SupportedBrowser = "chrome" | "edge" | "firefox" | "opera";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const CDP_PORT = 9225;
const REBUILD_DEBOUNCE_MS = 800;
const BUILD_TIMEOUT_MS = 120_000;
const STABILITY_THRESHOLD_MS = 150;
const POLL_INTERVAL_MS = 50;

function parseBrowserArg(): SupportedBrowser {
  const browserIndex = process.argv.findIndex(arg => arg === "--browser" || arg === "-b");
  const candidate = browserIndex >= 0 ? process.argv[browserIndex + 1] : undefined;
  const allowed: SupportedBrowser[] = ["chrome", "edge", "firefox", "opera"];
  if (candidate && allowed.includes(candidate as SupportedBrowser)) {
    return candidate as SupportedBrowser;
  }
  return "edge";
}

const BROWSER = parseBrowserArg();
const IS_FIREFOX = BROWSER === "firefox";
const IS_CHROMIUM = !IS_FIREFOX;
const WANTS_PROFILE = process.argv.includes("--with-profile");
const { LANG = "en" } = process.env;
const START_URL = "https://www.youtube.com/watch?v=aiSla-5xq3w";

const OUTPUT_DIR_NAME = `${BROWSER}-mv3-${IS_FIREFOX ? "prod" : "prod"}`;
const OUTPUT_DIR = resolve(PROJECT_ROOT, "build", OUTPUT_DIR_NAME);
const PROFILE_DIR = resolve(PROJECT_ROOT, "user-profiles", BROWSER);

const edgeBinaryByPlatform: Partial<Record<NodeJS.Platform, string>> = {
  win32: join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft/Edge/Application/msedge.exe"),
  darwin: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  linux: "/usr/bin/microsoft-edge"
};

const WXT_BIN = resolve(
  PROJECT_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wxt.cmd" : "wxt"
);

function buildExtension() {
  const args = ["build", "--mode", "prod", "-b", BROWSER];
  if (IS_FIREFOX) {
    args.push("--mv3");
  }
  const result = spawnSync(WXT_BIN, args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    shell: true,
    timeout: BUILD_TIMEOUT_MS
  });
  if (result.status !== 0) {
    throw new Error("Build failed");
  }
}

type CdpTarget = {
  type?: string;
  url: string;
  webSocketDebuggerUrl?: string;
  parentId?: string;
};

async function sendCdpMessage(websocketUrl: string, method: string, params: Record<string, unknown> = {}) {
  const websocket = new WebSocket(websocketUrl);
  await new Promise<void>(resolveAck => {
    websocket.onopen = () => websocket.send(JSON.stringify({ id: 1, method, params }));
    websocket.onmessage = e => {
      const data: { id?: number } = JSON.parse(String(e.data));
      if (data.id === 1) {
        websocket.close();
        resolveAck();
      }
    };
    websocket.onerror = () => resolveAck();
    websocket.onclose = () => resolveAck();
  });
}

async function fetchCdpTargets(port: number): Promise<CdpTarget[]> {
  try {
    const response = await fetch(`http://localhost:${port}/json`);
    return await response.json();
  } catch {
    return [];
  }
}

async function reloadYouTubeTabs(port: number) {
  const targets = await fetchCdpTargets(port);
  // Only reload top-level pages (not iframes) so embed-hosting pages keep their iframe state.
  const youtubeTabs = targets.filter(target =>
    target.type === "page"
    && target.url?.includes("youtube.com")
    && target.webSocketDebuggerUrl
    && !target.parentId
  );
  await Promise.all(
    youtubeTabs.map(tab =>
      sendCdpMessage(tab.webSocketDebuggerUrl ?? "", "Runtime.evaluate", { expression: "location.reload()" })
    )
  );
}

async function main() {
  process.chdir(PROJECT_ROOT);

  if (WANTS_PROFILE) {
    process.env[`${BROWSER === "edge" ? "EDGE" : BROWSER === "firefox" ? "FIREFOX" : "CHROME"}_WITH_PROFILE`] = "1";
  }

  console.log(`Building extension for ${BROWSER} (prod mode)...`);
  buildExtension();
  console.log("Build complete.\n");

  const WARN_LOG_LEVEL = 40;
  webExtConsoleStream.write = ({ level, msg: message }) => {
    if (level >= WARN_LOG_LEVEL) {
      console.warn(message);
    }
  };

  const chromiumArgs: string[] = [
    `--lang=${LANG}`,
    `--remote-debugging-port=${CDP_PORT}`,
    "--disable-blink-features=AutomationControlled"
  ];

  const useExistingProfile = WANTS_PROFILE && existsSync(PROFILE_DIR);
  if (useExistingProfile && IS_CHROMIUM) {
    chromiumArgs.push("--profile-directory=Profile 1");
  }

  const chromiumBinary = BROWSER === "edge" ? edgeBinaryByPlatform[platform()] : undefined;

  const runOptions = IS_FIREFOX
    ? {
      target: "firefox-desktop" as const,
      sourceDir: OUTPUT_DIR,
      startUrl: [START_URL],
      keepProfileChanges: useExistingProfile,
      ...useExistingProfile && { firefoxProfile: PROFILE_DIR },
      args: ["--marionette", "--remote-debugging-port=9230"],
      noReload: true,
      noInput: true
    }
    : {
      target: "chromium" as const,
      sourceDir: OUTPUT_DIR,
      startUrl: [START_URL],
      keepProfileChanges: useExistingProfile,
      ...useExistingProfile && { chromiumProfile: PROFILE_DIR },
      ...chromiumBinary && { chromiumBinary },
      args: chromiumArgs,
      noReload: true,
      noInput: true
    };

  const runner = await webExtRun.cmd.run(runOptions, { shouldExitProgram: false });
  console.log(`${BROWSER} launched with extension sideloaded.\n`);

  console.log("Watching for file changes...\n");

  const watcher = chokidar.watch(
    [join(PROJECT_ROOT, "src"), join(PROJECT_ROOT, "wxt.config.ts")],
    {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: STABILITY_THRESHOLD_MS,
        pollInterval: POLL_INTERVAL_MS
      }
    }
  );

  let isRebuilding = false;
  let pendingChange: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function drainPending() {
    if (isRebuilding) {
      return;
    }
    isRebuilding = true;
    try {
      while (pendingChange !== null) {
        const filePath = pendingChange;
        pendingChange = null;
        console.log(`\nChange detected: ${filePath}`);
        console.log("Rebuilding...");
        try {
          buildExtension();
          if (!IS_FIREFOX) {
            await runner.reloadAllExtensions().catch(() => undefined);
          }
          await reloadYouTubeTabs(CDP_PORT);
          console.log(`Reloaded at ${new Date().toLocaleTimeString()}`);
        } catch (error) {
          console.error("Rebuild failed:", error);
        }
      }
    } finally {
      isRebuilding = false;
    }
  }

  function scheduleRebuild(filePath: string) {
    pendingChange = filePath;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void drainPending();
    }, REBUILD_DEBOUNCE_MS);
  }

  watcher.on("all", (_event, filePath) => scheduleRebuild(filePath));
  watcher.on("error", error => console.error("Watcher error:", error));

  let isExiting = false;
  async function exit() {
    if (isExiting) {
      return;
    }
    isExiting = true;
    try {
      await watcher.close();
    } catch { /* ignore */ }
    try {
      await runner.exit();
    } catch { /* ignore */ }
    process.exit(0);
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void exit());
  }

  runner.registerCleanup(() => {
    console.log("\nBrowser closed. Exiting.");
    void exit();
  });

  await new Promise(() => undefined);
}

main().catch(error => {
  console.error("Fatal:", error);
  process.exit(1);
});
