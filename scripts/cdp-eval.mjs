// Evaluates an expression inside the content script world of the open YouTube tab.
// Usage: node scripts/cdp-eval.mjs "window.ytrAutoLikeEnabled" [url-substring]
const CDP_ORIGIN = "http://localhost:9225";
const URL_FILTER = process.argv[3] ?? "youtube.com/watch";

function client(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const events = [];
    ws.addEventListener("open", () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      events
    }));
    ws.addEventListener("error", error => reject(error));
    ws.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        events.push(message);
        return;
      }
      if (!pending.has(message.id)) {
        return;
      }
      const { res, rej } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        rej(new Error(JSON.stringify(message.error)));
        return;
      }
      res(message.result);
    });
  });
}

const wsUrl = target => target.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225");
const targets = await (await fetch(`${CDP_ORIGIN}/json`)).json();
const watchTarget = targets.find(target => target.type === "page" && target.url?.includes(URL_FILTER));
const watch = await client(wsUrl(watchTarget));
await watch.send("Runtime.enable");
await new Promise(resolve => setTimeout(resolve, 500));

const contexts = watch.events
  .filter(event => event.method === "Runtime.executionContextCreated")
  .map(event => event.params.context);
console.log("Contexts:", contexts.map(context => `${context.id}:${context.name || "-"}:${context.origin}`).join("\n           "));

// Content scripts run in one isolated world per frame, so a page with iframes reports
// several extension contexts - evaluate in each and report every one that answers
const isolatedContexts = contexts.filter(context => context.origin.startsWith("chrome-extension://"));
const expression = process.argv[2] ?? "window.ytrAutoLikeEnabled";
for (const context of isolatedContexts) {
  const result = await watch.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    contextId: context.id
  }).catch(error => ({ exceptionDetails: { text: error.message } }));
  console.log(`Result[${context.id}]:`, JSON.stringify(result.result?.value ?? result.exceptionDetails?.text));
}
process.exit(0);
