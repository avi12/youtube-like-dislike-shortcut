const MIN_PERCENTAGE = 0.4;
const POLL_INTERVAL_SECONDS = 0.5;
const MAX_POLLS = 60;
const ONE_SECOND_MS = 1000;
const SHIFT_MODIFIER = 8;
const SHORT_WAIT_SECONDS = 3;
const LONG_WAIT_SECONDS = 8;
const DIGIT_ZERO_KEY_CODE = 48;
// Verifies that the un-rate shortcut stops the auto-liker on an un-rated video.
// Run the dev server first, then: node scripts/verify-unrate.mjs
const CDP_ORIGIN = "http://localhost:9225";
const EXTENSION_ID = "kaggpeccfedlapjbckfpmeiodmlgepdn";
const AUTO_LIKE_THRESHOLD = 3;
const PLAYBACK_RATE = 2;
const SECONDS_AFTER_UNRATE = 15;
const SCREENSHOT_PATH = process.argv[2] ?? "unrate-frozen-counter.png";

function client(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    let nextId = 1;
    const pending = new Map();
    const events = [];
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
        events
      })
    );
    socket.addEventListener("error", error => reject(error));
    socket.addEventListener("message", event => {
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

function wsUrl(target) {
  return target.webSocketDebuggerUrl.replace(/^wss?:\/\/[^/]+/, "ws://localhost:9225");
}
async function listTargets() {
  return (await fetch(`${CDP_ORIGIN}/json`)).json();
}
function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * ONE_SECOND_MS));
}

async function evalIn({ target, expression, contextId }) {
  const result = await target.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    ...(contextId && {
      contextId
    })
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }

  return result.result?.value;
}

const targets = await listTargets();
const serviceWorkerTarget = targets.find(
  target => target.type === "service_worker" && target.url?.includes(EXTENSION_ID)
);
const watchTarget = targets.find(target => target.type === "page" && target.url?.includes("youtube.com/watch"));
if (!serviceWorkerTarget || !watchTarget) {
  console.log("Missing target", {
    serviceWorker: Boolean(serviceWorkerTarget),
    watch: Boolean(watchTarget)
  });
  process.exit(1);
}

const serviceWorker = await client(wsUrl(serviceWorkerTarget));
await serviceWorker.send("Runtime.enable");
await evalIn({
  target: serviceWorker,
  expression: `chrome.storage.sync.set({ isAutoLike: true, autoLikeThreshold: ${AUTO_LIKE_THRESHOLD} })`
});
console.log(`Auto-like enabled, threshold ${AUTO_LIKE_THRESHOLD}%`);

const watch = await client(wsUrl(watchTarget));
await watch.send("Page.enable");
await watch.send("Runtime.enable");

async function pressUnrate() {
  for (const type of ["rawKeyDown", "keyUp"]) {
    await watch.send("Input.dispatchKeyEvent", {
      type,
      modifiers: SHIFT_MODIFIER,
      code: "Digit0",
      key: ")",
      windowsVirtualKeyCode: DIGIT_ZERO_KEY_CODE,
      nativeVirtualKeyCode: DIGIT_ZERO_KEY_CODE
    });
  }
}

const READ_RATING = `(() => {
  const container = document.querySelector("ytd-watch-flexy:not([hidden]) #top-level-buttons-computed yt-smartimation");
  return {
    likePressed: container?.querySelector("like-button-view-model button, yt-button-shape.like button")?.ariaPressed ?? null,
    dislikePressed: container?.querySelector("dislike-button-view-model button, yt-button-shape.dislike button")?.ariaPressed ?? null
  };
})()`;

const ratingBefore = await evalIn({
  target: watch,
  expression: READ_RATING
});
const IS_RATED_BEFORE = ratingBefore.likePressed === "true" || ratingBefore.dislikePressed === "true";
if (IS_RATED_BEFORE) {
  console.log("Video was rated, clearing it first:", ratingBefore);
  await pressUnrate();
  await wait(SHORT_WAIT_SECONDS);
  console.log(
    "Cleared:",
    await evalIn({
      target: watch,
      expression: READ_RATING
    })
  );
}

await watch.send("Page.reload");
await wait(LONG_WAIT_SECONDS);

const isolatedContext = watch.events.findLast(
  event =>
    event.method === "Runtime.executionContextCreated" &&
    event.params.context.origin === `chrome-extension://${EXTENSION_ID}`
);
if (!isolatedContext) {
  console.log("Could not find the content script world");
  process.exit(1);
}

const isolatedContextId = isolatedContext.params.context.id;

const READ_CONTENT_SCRIPT_STATE = `({
  isAutoLikeEnabled: window.ytrAutoLikeEnabled,
  threshold: window.ytrAutoLikeThreshold,
  isUserInteracted: window.ytrUserInteracted,
  subscriptionDecision: window.ytrSubscriptionDecision ?? null
})`;

const READ_PAGE_STATE = `(() => {
  const container = document.querySelector("ytd-watch-flexy:not([hidden]) #top-level-buttons-computed yt-smartimation");
  const elPercentage = document.querySelector("ytr-percentage");
  const video = document.querySelector("video");
  return {
    likePressed: container?.querySelector("like-button-view-model button, yt-button-shape.like button")?.ariaPressed ?? null,
    dislikePressed: container?.querySelector("dislike-button-view-model button, yt-button-shape.dislike button")?.ariaPressed ?? null,
    percentage: elPercentage?.shadowRoot?.querySelector("body")?.textContent?.trim() ?? null,
    currentTime: video?.currentTime ?? null
  };
})()`;

console.log(
  "Content script:",
  await evalIn({
    target: watch,
    expression: READ_CONTENT_SCRIPT_STATE,
    contextId: isolatedContextId
  })
);

await evalIn({
  target: watch,
  expression: `(() => {
  const video = document.querySelector("video");
  video.muted = true;
  video.currentTime = 0;
  video.playbackRate = ${PLAYBACK_RATE};
  return video.play();
})()`
});

let beforeUnrate = null;
for (let i = 0; i < MAX_POLLS; i++) {
  await wait(POLL_INTERVAL_SECONDS);
  const state = await evalIn({
    target: watch,
    expression: READ_PAGE_STATE
  });
  if (Number.parseFloat(state.percentage ?? "") > MIN_PERCENTAGE) {
    beforeUnrate = state;
    break;
  }
}
console.log("Counting before un-rate:", beforeUnrate);

if (!beforeUnrate) {
  console.log(
    "FAIL - the percentage counter never started:",
    await evalIn({
      target: watch,
      expression: READ_PAGE_STATE
    })
  );
  process.exit(1);
}

await pressUnrate();
console.log("Pressed the un-rate shortcut on an un-rated video");

await wait(SECONDS_AFTER_UNRATE);
const afterUnrate = await evalIn({
  target: watch,
  expression: READ_PAGE_STATE
});
console.log("After un-rate:", afterUnrate);
console.log(
  "Content script:",
  await evalIn({
    target: watch,
    expression: READ_CONTENT_SCRIPT_STATE,
    contextId: isolatedContextId
  })
);

const actionsRect = await evalIn({
  target: watch,
  expression: `(() => {
  const { top, left, width, height } = document.querySelector("ytd-watch-flexy:not([hidden]) #actions").getBoundingClientRect();
  return { x: Math.round(left) - 8, y: Math.round(top) - 8, width: Math.round(width) + 16, height: Math.round(height) + 16, scale: 2 };
})()`
});
const { data } = await watch.send("Page.captureScreenshot", {
  format: "png",
  clip: actionsRect,
  captureBeyondViewport: true
});
await (await import("node:fs/promises")).writeFile(SCREENSHOT_PATH, Buffer.from(data, "base64"));
console.log("Saved screenshot:", SCREENSHOT_PATH);

await evalIn({
  target: watch,
  expression: `document.querySelector("video").pause()`
});
await evalIn({
  target: serviceWorker,
  expression: `Promise.all([
  chrome.storage.sync.remove(["isAutoLike", "autoLikeThreshold"]),
  chrome.storage.local.remove(["isAutoLike", "autoLikeThreshold"])
])`
});

const IS_STILL_PLAYING = afterUnrate.currentTime - beforeUnrate.currentTime > 0;
const IS_COUNTING_STOPPED = afterUnrate.percentage === beforeUnrate.percentage;
const IS_STILL_UNRATED = afterUnrate.likePressed !== "true" && afterUnrate.dislikePressed !== "true";
console.log("\n== VERDICT ==");
console.log(
  IS_STILL_PLAYING && IS_COUNTING_STOPPED && IS_STILL_UNRATED
    ? "PASS - counting froze and the video was never auto-liked"
    : `FAIL - kept playing: ${IS_STILL_PLAYING}, counting stopped: ${IS_COUNTING_STOPPED}, still un-rated: ${IS_STILL_UNRATED}`
);
process.exit(0);
