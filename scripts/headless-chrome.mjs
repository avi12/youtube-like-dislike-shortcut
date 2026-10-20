import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";

export const SIGNED_IN_TEST_PROFILE = new URL("../user-profiles/headless-test", import.meta.url).pathname.slice(1);

export async function launchMutedHeadlessChrome({ extensionPath, profileDirectory, profilePath = mkdtempSync(join(tmpdir(), "ytr-headless-")) }) {
  const chrome = spawn(CHROME_PATH, [
    ...(process.env.HEADFUL ? [] : ["--headless=new"]),
    "--mute-audio",
    "--autoplay-policy=no-user-gesture-required",
    "--remote-debugging-pipe",
    "--enable-unsafe-extension-debugging",
    "--no-first-run",
    ...(process.env.ONLY_EXTENSION_PATH ? [`--disable-extensions-except=${process.env.ONLY_EXTENSION_PATH}`] : []),
    ...(profileDirectory ? [`--profile-directory=${profileDirectory}`] : []),
    "--window-size=1280,900",
    `--user-data-dir=${profilePath}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  const [, , , pipeToChrome, pipeFromChrome] = chrome.stdio;
  let nextId = 1;
  let buffered = "";
  const pending = new Map();
  const listeners = [];

  pipeFromChrome.on("data", chunk => {
    buffered += chunk.toString("utf8");
    const messages = buffered.split("\0");
    buffered = messages.pop();
    for (const text of messages) {
      const message = JSON.parse(text);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
        continue;
      }
      for (const listener of listeners) {
        listener(message);
      }
    }
  });

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    pipeToChrome.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
  });

  const extensionId = extensionPath ? (await send("Extensions.loadUnpacked", { path: extensionPath })).id : process.env.INSTALLED_EXTENSION_ID;
  if (process.env.SECOND_EXTENSION_PATH) {
    await send("Extensions.loadUnpacked", { path: process.env.SECOND_EXTENSION_PATH });
  }
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);

  return {
    extensionId,
    sessionId,
    send,
    onMessage: listener => listeners.push(listener),
    evaluate: async (expression, targetSessionId = sessionId) => {
      const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, targetSessionId);
      if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      }
      return result.value;
    },
    close: async () => {
      await send("Browser.close").catch(() => {});
    }
  };
}

export const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
