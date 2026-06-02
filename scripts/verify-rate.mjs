// Reuses the existing edge://newtab tab — no new window pops up.
const VIDEO_ID = "e7gFaim6vLs";

function client(url, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const subs = [];
    ws.addEventListener("open", () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      on: h => subs.push(h),
      name
    }));
    ws.addEventListener("error", e => reject(e));
    ws.addEventListener("message", e => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) {
          rej(msg.error);
        } else {
          res(msg.result);
        }
        return;
      }
      for (const h of subs) {
        h(msg);
      }
    });
  });
}
async function evalIn(t, expr) {
  const r = await t.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.text);
  }
  return r.result?.value;
}
async function listTargets() {
  return (await fetch("http://localhost:9225/json")).json(); 
}
function wsUrl(t) {
  return t.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"); 
}
const formatArgs = a => (a ?? []).map(x => {
  if (x.value !== undefined) return JSON.stringify(x.value);
  if (x.preview?.properties) {
    const props = x.preview.properties.map(p => `${p.name}:${p.value ?? p.type}`).join(",");
    return `{${props}}`;
  }
  return x.description ?? "";
}).join(" ");
const attachLog = (c, label) => c.on(m => {
  if (m.method === "Runtime.consoleAPICalled") {
    console.log(`[${label}:${m.params.type}] ${formatArgs(m.params.args)}`);
  }
  if (m.method === "Runtime.exceptionThrown") {
    console.log(`[${label}:EXCEPTION] ${m.params.exceptionDetails.text}`);
  }
});

// SW may be dormant — wake it by attaching to the browser-level CDP and discovering targets.
const browserVer = await (await fetch("http://localhost:9225/json/version")).json();
const browserClient = await client(browserVer.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"), "browser");
await browserClient.send("Target.setDiscoverTargets", { discover: true });
const attachedSet = new Set();
async function tryAttach(target, label) {
  if (attachedSet.has(target.id)) return;
  attachedSet.add(target.id);
  console.log(`[${label}] attaching`, target.id, target.url);
  try {
    const c = await client(wsUrl(target), label);
    await c.send("Runtime.enable");
    attachLog(c, label);
  } catch (err) {
    console.log(`[${label}] attach failed`, err?.message ?? err);
  }
}
async function discoverAndAttach() {
  const ts = await listTargets();
  for (const t of ts) {
    if (attachedSet.has(t.id)) continue;
    if (t.type === "service_worker" && t.url?.includes("/background.js") && !t.url.includes("eimadpb")) {
      await tryAttach(t, "sw");
    } else if (t.url?.includes("/offscreen.html")) {
      await tryAttach(t, "off");
    } else if (t.type === "iframe" && t.url?.includes("youtube.com/watch") && t.url?.includes("mute=1")) {
      await tryAttach(t, "hid");
    }
  }
}
await discoverAndAttach();
const discoverInterval = setInterval(() => { discoverAndAttach().catch(() => undefined); }, 500);

// Find any existing watch tab; if none, create a NEW TAB in the same window via Target.createTarget.
const targets = await listTargets();
let host = targets.find(t => t.type === "page" && t.url?.includes("youtube.com/watch"));
if (!host) {
  // Use any extension's browser-attached target to create a new tab in the same window.
  // The "browser" endpoint exposes Target.* without needing a page target.
  const browserRes = await (await fetch("http://localhost:9225/json/version")).json();
  const browser = await client(browserRes.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"), "browser");
  const created = await browser.send("Target.createTarget", { url: `https://www.youtube.com/watch?v=${VIDEO_ID}`, newWindow: false, background: true });
  console.log("Created tab:", created.targetId);
  await new Promise(r => setTimeout(r, 500));
  host = (await listTargets()).find(t => t.id === created.targetId);
}
console.log("Reusing tab:", host.id, host.url);
const watch = await client(wsUrl(host), "watch");
await watch.send("Runtime.enable");
await watch.send("Page.enable");
attachLog(watch, "watch");

// Baseline
console.log("\n== Baseline ==");
await watch.send("Page.navigate", { url: `https://www.youtube.com/watch?v=${VIDEO_ID}&t=${Date.now()}` });
let baseline = null;
for (let i = 0; i < 60 && !baseline; i++) {
  await new Promise(r => setTimeout(r, 500));
  try {
    baseline = await evalIn(watch, `(()=>{const b=document.querySelector("like-button-view-model button");return b?{pressed:b.getAttribute("aria-pressed"),label:b.getAttribute("aria-label")}:null;})()`);
  } catch {}
}
console.log("Baseline:", baseline);

// Reload mapsplatform host so the embed picks up the latest content script
console.log("\n== Reload host ==");
const hostPage = (await listTargets()).find(t => t.type === "page" && t.url?.includes("mapsplatform.google.com"));
if (hostPage) {
  const hostClient = await client(wsUrl(hostPage), "host");
  await hostClient.send("Page.enable");
  await hostClient.send("Page.reload");
  await new Promise(r => setTimeout(r, 6000));
}

// Trigger
console.log("\n== Trigger ==");
const embedT = (await listTargets()).find(t => t.type === "iframe" && t.url?.includes("youtube.com/embed/"));
if (!embedT) {
  console.log("No embed iframe"); process.exit(1);
}
const embed = await client(wsUrl(embedT), "embed");
await embed.send("Runtime.enable");
attachLog(embed, "embed");
await embed.send("Runtime.evaluate", { expression: `document.dispatchEvent(new KeyboardEvent("keydown",{key:"+",code:"Equal",shiftKey:true,bubbles:true,cancelable:true}))` });

// Wait for rate flow (longer than the bridge timeout)
console.log("Waiting 25s for rate flow + logs...");
await new Promise(r => setTimeout(r, 25000));
clearInterval(discoverInterval);

// Re-read
console.log("\n== After (fresh navigation) ==");
await watch.send("Page.navigate", { url: `https://www.youtube.com/watch?v=${VIDEO_ID}&t=${Date.now()}` });
let after = null;
for (let i = 0; i < 60 && !after; i++) {
  await new Promise(r => setTimeout(r, 500));
  try {
    after = await evalIn(watch, `(()=>{const b=document.querySelector("like-button-view-model button");return b?{pressed:b.getAttribute("aria-pressed"),label:b.getAttribute("aria-label")}:null;})()`);
  } catch {}
}
console.log("After:", after);

console.log("\n== VERDICT ==");
console.log(baseline?.pressed === "false" && after?.pressed === "true" ? "PASS — like persisted" : `FAIL  baseline=${baseline?.pressed}  after=${after?.pressed}`);
process.exit(0);
