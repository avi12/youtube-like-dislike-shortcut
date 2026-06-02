const targets = await (await fetch("http://localhost:9225/json")).json();
const anyPage = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
if (!anyPage) { console.log("No page target"); process.exit(1); }
const ws = new WebSocket(anyPage.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"));
await new Promise(r => ws.addEventListener("open", () => r()));
const send = (id, method, params) => {
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise(resolve => {
    const onMsg = e => {
      const m = JSON.parse(e.data);
      if (m.id === id) {
        ws.removeEventListener("message", onMsg);
        resolve(m.result);
      }
    };
    ws.addEventListener("message", onMsg);
  });
};
const cookies = await send(1, "Network.getAllCookies", {});
const ytCookies = cookies.cookies.filter(c => c.domain.includes("youtube.com"));
const sortedYt = [...new Set(ytCookies.map(c => `${c.domain}|${c.name}`))].sort();
console.log("All .youtube.com cookies:");
for (const c of sortedYt) console.log(" ", c);
const hasSapisid = sortedYt.some(c => /SAPISID|3PAPISID/.test(c));
console.log("\nSAPISID present on youtube.com?", hasSapisid);
process.exit(0);
