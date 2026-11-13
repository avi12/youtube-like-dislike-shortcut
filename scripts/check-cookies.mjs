const targets = await (await fetch("http://localhost:9225/json")).json();
const anyPage = targets.find(target => target.type === "page" && target.webSocketDebuggerUrl);
if (!anyPage) {
  console.log("No page target");
  process.exit(1);
}

const socket = new WebSocket(anyPage.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225"));
await new Promise(resolve => socket.addEventListener("open", () => resolve()));
function send(id, method, params) {
  socket.send(
    JSON.stringify({
      id,
      method,
      params
    })
  );
  return new Promise(resolve => {
    function onMsg(event) {
      const message = JSON.parse(event.data);
      if (message.id === id) {
        socket.removeEventListener("message", onMsg);
        resolve(message.result);
      }
    }
    socket.addEventListener("message", onMsg);
  });
}
const cookies = await send(1, "Network.getAllCookies", {});
const ytCookies = cookies.cookies.filter(cookie => cookie.domain.includes("youtube.com"));
const sortedYt = [...new Set(ytCookies.map(cookie => `${cookie.domain}|${cookie.name}`))].sort();
console.log("All .youtube.com cookies:");
for (const cookie of sortedYt) {
  console.log(" ", cookie);
}
const HAS_SAPISID = sortedYt.some(cookie => /SAPISID|3PAPISID/.test(cookie));
console.log("\nSAPISID present on youtube.com?", HAS_SAPISID);
process.exit(0);
