// Probes what actually changes on a YouTube Music track transition.
// YT Music advances the queue seamlessly inside one MediaSource, so the <video>
// element's currentSrc/currentTime/duration do NOT reset and no media events fire.
// Samples every 100ms and prints only the samples where a signal changed, so the
// ordering of (media session title, progress bar, like status) around a transition is visible.
// Usage: node scripts/probe-music-track-change.mjs [seconds]
const CDP_ORIGIN = "http://localhost:9225";
const DURATION_SECONDS = Number(process.argv[2] ?? 180);

function client(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    ws.addEventListener("open", () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      })
    }));
    ws.addEventListener("error", error => reject(error));
    ws.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) {
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

const INSTALL = `(() => {
  window.__ytrProbeLog = [];
  clearInterval(window.__ytrProbeTimer);

  const readSignals = () => {
    const elVideo = document.querySelector("video");
    const elProgress = document.querySelector("#progress-bar");
    const elLike = document.querySelector("ytmusic-player-bar ytmusic-like-button-renderer");
    return {
      videoTime: elVideo ? Math.round(elVideo.currentTime) : null,
      videoDuration: elVideo ? Math.round(elVideo.duration) : null,
      trackPosition: elProgress?.getAttribute("aria-valuenow") ?? null,
      trackDuration: elProgress?.getAttribute("aria-valuemax") ?? null,
      title: document.querySelector("ytmusic-player-bar .title")?.textContent?.trim() ?? null,
      linkVideoId: (document.querySelector("#movie_player a.ytp-title-link")?.getAttribute("href") ?? "").match(/[?&]v=([^&]+)/)?.[1] ?? null,
      playerVideoId: document.querySelector("#movie_player")?.getVideoData?.()?.video_id ?? null,
      initialResponseVideoId: window.ytInitialPlayerResponse?.videoDetails?.videoId ?? null,
      initialDataVideoId: window.ytInitialData?.currentVideoEndpoint?.watchEndpoint?.videoId ?? null,
      isAd: Boolean(document.querySelector("#movie_player.ad-showing")),
      likeStatus: elLike?.getAttribute("like-status") ?? null,
      percentageUi: document.querySelector("ytr-percentage-music")?.shadowRoot?.querySelector("body")?.textContent?.trim() ?? "(unmounted)"
    };
  };

  const record = label => window.__ytrProbeLog.push({ at: Math.round(performance.now()), label, ...readSignals() });

  for (const mediaEvent of ["loadstart", "emptied", "durationchange", "loadedmetadata", "ended", "seeking"]) {
    document.addEventListener(mediaEvent, e => {
      if (e.target instanceof HTMLVideoElement) record("EVENT:" + mediaEvent);
    }, { capture: true });
  }

  let lastTitle = null;
  let denseUntil = 0;
  window.__ytrProbeTimer = setInterval(() => {
    const signals = readSignals();
    const isTitleChanged = lastTitle !== null && signals.title !== lastTitle;
    if (isTitleChanged) {
      denseUntil = performance.now() + 6000;
      record("TITLE-CHANGED");
    }
    lastTitle = signals.title;
    if (performance.now() < denseUntil) {
      record("dense");
    }
  }, 100);

  setInterval(() => record("tick"), 3000);

  record("installed");
  return "ok";
})()`;

const DRAIN = `(() => { const entries = window.__ytrProbeLog ?? []; window.__ytrProbeLog = []; return JSON.stringify(entries); })()`;

const wsUrl = target => target.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225");
const targets = await (await fetch(`${CDP_ORIGIN}/json`)).json();
const musicTarget = targets.find(target => target.type === "page" && target.url?.includes("music.youtube.com"));
if (!musicTarget) {
  console.log("Open a music.youtube.com tab first.");
  process.exit(1);
}

const page = await client(wsUrl(musicTarget));
await page.send("Runtime.enable");
const evaluate = expression => page.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
const installed = await evaluate(INSTALL);
console.log("Install:", installed.result?.value ?? installed.exceptionDetails?.text);

const deadline = Date.now() + DURATION_SECONDS * 1000;
while (Date.now() < deadline) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const drained = await evaluate(DRAIN);
  for (const entry of JSON.parse(drained.result?.value ?? "[]")) {
    console.log(JSON.stringify(entry));
  }
}
process.exit(0);
