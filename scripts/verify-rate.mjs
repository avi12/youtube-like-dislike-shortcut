const POLL_INTERVAL_MS = 500;
const MAX_POLLS = 60;
const TWENTY_FIVE_SECONDS_MS = 25000;
const SIX_SECONDS_MS = 6000;
// Reuses the existing edge://newtab tab - no new window pops up.
const VIDEO_ID = "e7gFaim6vLs";

function client({ url, name }) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const subs = [];
    socket.addEventListener("open", () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            const id = nextId++;
            pending.set(id, {
              res,
              rej
            });
            socket.send(
              JSON.stringify({
                id,
                method,
                params
              })
            );
          }),
        on: handler => subs.push(handler),
        name
      })
    );
    socket.addEventListener("error", event => reject(event));
    socket.addEventListener("message", event => {
      const msg = JSON.parse(event.data);
      const isPendingReply = msg.id && pending.has(msg.id);
      if (isPendingReply) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);

        if (msg.error) {
          rej(msg.error);
        } else {
          res(msg.result);
        }

        return;
      }

      for (const handler of subs) {
        handler(msg);
      }
    });
  });
}
async function evalIn({ target, expr }) {
  const result = await target.send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }

  return result.result?.value;
}
async function listTargets() {
  return (await fetch("http://localhost:9225/json")).json();
}
function wsUrl(target) {
  return target.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225");
}
function formatArgs(argument) {
  return (argument ?? [])
    .map(x => {
      if (x.value !== undefined) {
        return JSON.stringify(x.value);
      }

      if (x.preview?.properties) {
        const props = x.preview.properties
          .map(property => `${property.name}:${property.value ?? property.type}`)
          .join(",");
        return `{${props}}`;
      }

      return x.description ?? "";
    })
    .join(" ");
}
function attachLog({ connection, label }) {
  return connection.on(message => {
    if (message.method === "Runtime.consoleAPICalled") {
      console.log(`[${label}:${message.params.type}] ${formatArgs(message.params.args)}`);
    }

    if (message.method === "Runtime.exceptionThrown") {
      console.log(`[${label}:EXCEPTION] ${message.params.exceptionDetails.text}`);
    }
  });
}

// SW may be dormant - wake it by attaching to the browser-level CDP and discovering targets.
const browserVer = await (await fetch("http://localhost:9225/json/version")).json();
const browserClient = await client({
  url: browserVer.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"),
  name: "browser"
});
await browserClient.send("Target.setDiscoverTargets", { discover: true });
const attachedSet = new Set();
async function tryAttach({ target, label }) {
  if (attachedSet.has(target.id)) {
    return;
  }

  attachedSet.add(target.id);
  console.log(`[${label}] attaching`, target.id, target.url);
  try {
    const connection = await client({
      url: wsUrl(target),
      name: label
    });
    await connection.send("Runtime.enable");
    attachLog({
      connection,
      label
    });
  } catch (err) {
    console.log(`[${label}] attach failed`, err?.message ?? err);
  }
}
async function discoverAndAttach() {
  const listedTargets = await listTargets();
  for (const target of listedTargets) {
    if (attachedSet.has(target.id)) {
      continue;
    }

    const isBackgroundWorker =
      target.type === "service_worker" && target.url?.includes("/background.js") && !target.url.includes("eimadpb");
    if (isBackgroundWorker) {
      await tryAttach({
        target,
        label: "sw"
      });
    } else if (target.url?.includes("/offscreen.html")) {
      await tryAttach({
        target,
        label: "off"
      });
    } else if (
      target.type === "iframe" &&
      target.url?.includes("youtube.com/watch") &&
      target.url?.includes("mute=1")
    ) {
      await tryAttach({
        target,
        label: "hid"
      });
    }
  }
}
await discoverAndAttach();
const discoverInterval = setInterval(() => {
  discoverAndAttach().catch(() => undefined);
}, 500);

// Find any existing watch tab; if none, create a NEW TAB in the same window via Target.createTarget.
const targets = await listTargets();
let host = targets.find(target => target.type === "page" && target.url?.includes("youtube.com/watch"));
if (!host) {
  // Use any extension's browser-attached target to create a new tab in the same window.
  // The "browser" endpoint exposes Target.* without needing a page target.
  const browserRes = await (await fetch("http://localhost:9225/json/version")).json();
  const browser = await client({
    url: browserRes.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"),
    name: "browser"
  });
  const created = await browser.send("Target.createTarget", {
    url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    newWindow: false,
    background: true
  });
  console.log("Created tab:", created.targetId);
  await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  host = (await listTargets()).find(target => target.id === created.targetId);
}

console.log("Reusing tab:", host.id, host.url);
const watch = await client({
  url: wsUrl(host),
  name: "watch"
});
await watch.send("Runtime.enable");
await watch.send("Page.enable");
attachLog({
  connection: watch,
  label: "watch"
});

// Baseline
console.log("\n== Baseline ==");
await watch.send("Page.navigate", { url: `https://www.youtube.com/watch?v=${VIDEO_ID}&t=${Date.now()}` });
let baseline = null;
for (let i = 0; i < MAX_POLLS && !baseline; i++) {
  await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  try {
    baseline = await evalIn({
      target: watch,
      expr: `(()=>{const b=document.querySelector("like-button-view-model button");return b?{pressed:b.getAttribute("aria-pressed"),label:b.getAttribute("aria-label")}:null;})()`
    });
  } catch {}
}
console.log("Baseline:", baseline);

// Reload mapsplatform host so the embed picks up the latest content script
console.log("\n== Reload host ==");
const hostPage = (await listTargets()).find(
  target => target.type === "page" && target.url?.includes("mapsplatform.google.com")
);
if (hostPage) {
  const hostClient = await client({
    url: wsUrl(hostPage),
    name: "host"
  });
  await hostClient.send("Page.enable");
  await hostClient.send("Page.reload");
  await new Promise(resolve => setTimeout(resolve, SIX_SECONDS_MS));
}

// Trigger
console.log("\n== Trigger ==");
const embedT = (await listTargets()).find(
  target => target.type === "iframe" && target.url?.includes("youtube.com/embed/")
);
if (!embedT) {
  console.log("No embed iframe");
  process.exit(1);
}

const embed = await client({
  url: wsUrl(embedT),
  name: "embed"
});
await embed.send("Runtime.enable");
attachLog({
  connection: embed,
  label: "embed"
});
await embed.send("Runtime.evaluate", {
  expression: `document.dispatchEvent(new KeyboardEvent("keydown",{key:"+",code:"Equal",shiftKey:true,bubbles:true,cancelable:true}))`
});

// Wait for rate flow (longer than the bridge timeout)
console.log("Waiting 25s for rate flow + logs...");
await new Promise(resolve => setTimeout(resolve, TWENTY_FIVE_SECONDS_MS));
clearInterval(discoverInterval);

// Re-read
console.log("\n== After (fresh navigation) ==");
await watch.send("Page.navigate", { url: `https://www.youtube.com/watch?v=${VIDEO_ID}&t=${Date.now()}` });
let after = null;
for (let i = 0; i < MAX_POLLS && !after; i++) {
  await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  try {
    after = await evalIn({
      target: watch,
      expr: `(()=>{const b=document.querySelector("like-button-view-model button");return b?{pressed:b.getAttribute("aria-pressed"),label:b.getAttribute("aria-label")}:null;})()`
    });
  } catch {}
}
console.log("After:", after);

console.log("\n== VERDICT ==");
console.log(
  baseline?.pressed === "false" && after?.pressed === "true"
    ? "PASS - like persisted"
    : `FAIL  baseline=${baseline?.pressed}  after=${after?.pressed}`
);
process.exit(0);
