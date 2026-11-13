import { launchMutedHeadlessChrome, SIGNED_IN_TEST_PROFILE, sleep } from "./headless-chrome.mjs";

const ONE_SECOND_MS = 1000;
const DEFAULT_WATCH_SECONDS = 16;
const HIGH_AUTO_LIKE_THRESHOLD = 40;
const LOW_AUTO_LIKE_THRESHOLD = 5;
const POLL_INTERVAL_MS = 500;
const MAX_ATTEMPTS = 30;
const TWO_AND_A_HALF_SECONDS_MS = 2500;
const MAX_RETRIES = 3;
const FOUR_SECONDS_MS = 4000;
const THREE_SECONDS_MS = 3000;

const [
  extensionPath,
  profilePath = SIGNED_IN_TEST_PROFILE,
  initialRating = "none",
  navigationMode = "load",
  videoId = "jNQXAC9IVRw",
  otherVideoId = "dQw4w9WgXcQ",
  midWatchAction = "none"
] = process.argv.slice(2);
const browser = await launchMutedHeadlessChrome({
  extensionPath,
  profilePath,
  profileDirectory: "Profile 1"
});

function readRating() {
  return browser.evaluate(
    `(() => {
  const visiblePressed = selector => [...document.querySelectorAll(selector)].filter(el => el.getClientRects().length > 0).map(el => el.ariaPressed);
  return {
    url: location.search,
    like: visiblePressed("like-button-view-model button"),
    dislike: visiblePressed("dislike-button-view-model button"),
    time: Math.round(document.querySelector("video")?.currentTime ?? -1)
  };
})()`
  );
}

function clickVisible(selector) {
  return browser.evaluate(
    `(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(candidate => candidate.getClientRects().length > 0);
  el?.click();
  return Boolean(el);
})()`
  );
}

async function waitForButtons() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { like, dislike } = await readRating();
    if (like.length > 0 && dislike.length > 0 && like[0] !== null) {
      return;
    }

    await sleep(ONE_SECOND_MS);
  }
  throw new Error("buttons never appeared");
}

async function navigate(id) {
  await browser.send("Page.navigate", { url: `https://www.youtube.com/watch?v=${id}` }, browser.sessionId);
  await sleep(THREE_SECONDS_MS);
  await waitForButtons();
  await sleep(FOUR_SECONDS_MS);
}

async function setInitialRating(id) {
  await navigate(id);
  const target = {
    none: null,
    like: "like-button-view-model button",
    dislike: "dislike-button-view-model button"
  }[initialRating];
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { like, dislike } = await readRating();
    const isLiked = like[0] === "true";
    const isDisliked = dislike[0] === "true";
    if (initialRating === "none" && !isLiked && !isDisliked) {
      return;
    }

    if (initialRating === "like" && isLiked) {
      return;
    }

    if (initialRating === "dislike" && isDisliked) {
      return;
    }

    if (initialRating === "none") {
      await clickVisible(isLiked ? "like-button-view-model button" : "dislike-button-view-model button");
    } else {
      await clickVisible(target);
    }

    await sleep(TWO_AND_A_HALF_SECONDS_MS);
  }
}

try {
  await browser.send("Page.navigate", { url: "https://www.youtube.com/robots.txt" }, browser.sessionId);
  await browser.send("Page.navigate", { url: "https://www.youtube.com/" }, browser.sessionId);
  let worker;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !worker; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    const { targetInfos } = await browser.send("Target.getTargets");
    worker = targetInfos.find(
      target =>
        target.type === "service_worker" &&
        target.url.startsWith("chrome-extension://") &&
        (!browser.extensionId || target.url.includes(browser.extensionId))
    );
  }

  if (!worker) {
    throw new Error("extension service worker never started");
  }

  const { sessionId: workerSessionId } = await browser.send("Target.attachToTarget", {
    targetId: worker.targetId,
    flatten: true
  });
  await browser.send("Runtime.enable", {}, workerSessionId);
  function setStorage(values) {
    return browser.evaluate(`chrome.storage.sync.set(${JSON.stringify(values)})`, workerSessionId);
  }

  await setStorage({ isAutoLike: false });
  await setInitialRating(videoId);
  console.log("INITIAL", JSON.stringify(await readRating()));

  await browser.send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
      source: `window.__clicks = []; document.addEventListener("click", e => { const el = e.target.closest("button"); if (el) window.__clicks.push({ label: el.ariaLabel, trusted: e.isTrusted, at: Math.round(performance.now()) }); }, true);`
    },
    browser.sessionId
  );
  await setStorage({
    isAutoLike: true,
    autoLikeThreshold: midWatchAction === "none" ? LOW_AUTO_LIKE_THRESHOLD : HIGH_AUTO_LIKE_THRESHOLD
  });

  if (navigationMode === "spa") {
    await navigate(otherVideoId);
    await browser.evaluate(
      `document.querySelector("ytd-app").dispatchEvent(new CustomEvent("yt-navigate", { detail: { endpoint: {
      commandMetadata: { webCommandMetadata: { url: "/watch?v=${videoId}", webPageType: "WEB_PAGE_TYPE_WATCH", rootVe: 3832 } },
      watchEndpoint: { videoId: "${videoId}" }
    } } }))`
    );
  } else {
    await navigate(videoId);
  }

  for (let second = 0; second < Number(process.env.WATCH_SECONDS ?? DEFAULT_WATCH_SECONDS); second++) {
    await sleep(ONE_SECOND_MS);

    if (process.env.PLAYBACK_RATE) {
      await browser.evaluate(
        `document.querySelectorAll("video").forEach(video => { video.playbackRate = ${Number(process.env.PLAYBACK_RATE)}; })`
      );
    }

    if (second === 2 && midWatchAction === "dislike") {
      const point = await browser.evaluate(
        `(() => {
        const rect = [...document.querySelectorAll("dislike-button-view-model button")].find(el => el.getClientRects().length > 0).getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`
      );
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
        await browser.send(
          "Input.dispatchMouseEvent",
          {
            type,
            ...point,
            button: "left",
            clickCount: 1
          },
          browser.sessionId
        );
      }
      console.log("USER CLICKED DISLIKE");
    }

    console.log(JSON.stringify(await readRating()), JSON.stringify(await browser.evaluate("window.__clicks")));
  }
} finally {
  await browser.close();
}
