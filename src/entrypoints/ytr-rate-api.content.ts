import { YTCFG_KEY } from "@/lib/types";
import { SELECTORS, YOUTUBE_PATHNAME } from "@/lib/utils-initials";
import { RateAction, type RateContext, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import { executeRateRequest, fetchRateParamsFromNext } from "@/lib/ytr-rate-fetch";
import { buildSapisidAuthorization } from "@/lib/ytr-sapisid";

const WEB_CLIENT_NAME_NUMBER = 1;

const paramFieldForAction: Record<RateAction, "likeParams" | "dislikeParams" | "removeLikeParams"> = {
  [RateAction.like]: "likeParams",
  [RateAction.dislike]: "dislikeParams",
  [RateAction.removelike]: "removeLikeParams"
};

interface MoviePlayerElement extends HTMLElement {
  getVideoData?: () => { video_id?: string } | undefined;
}

function getVideoIdFromPlayer() {
  const player = document.querySelector<MoviePlayerElement>(SELECTORS.moviePlayer);
  return player?.getVideoData?.()?.video_id ?? "";
}

function getVideoIdFromEmbedUrl() {
  const match = location.pathname.match(/^\/embed\/([^/?]+)/);
  return match ? match[1] : "";
}

function getVideoIdFromChannelTrailer() {
  const trailer = document.querySelector(SELECTORS.channelTrailerPlayer);
  const isTrailerWithData = trailer && "data" in trailer;
  if (!isTrailerWithData) {
    return "";
  }
  const { data } = trailer;
  const isValidVideoData = data && typeof data === "object" && "videoId" in data && data.videoId;
  if (!isValidVideoData) {
    return "";
  }
  return String(data.videoId);
}

function getVideoId() {
  const isWatchPage = location.pathname === YOUTUBE_PATHNAME.watch;
  if (isWatchPage) {
    return getVideoIdFromPlayer();
  }
  const isEmbedPage = location.pathname.startsWith(YOUTUBE_PATHNAME.embed);
  if (isEmbedPage) {
    return getVideoIdFromPlayer() || getVideoIdFromEmbedUrl();
  }
  return getVideoIdFromChannelTrailer();
}

function getRateContext(): RateContext | null {
  const ytcfg = window.ytcfg;
  if (!ytcfg) {
    return null;
  }
  const videoId = getVideoId();
  const clientNameNumber = ytcfg.get(YTCFG_KEY.clientName);
  const clientVersion = ytcfg.get(YTCFG_KEY.clientVersion);
  const innertubeContext = ytcfg.get(YTCFG_KEY.innertubeContext);
  const delegatedSessionId = ytcfg.get(YTCFG_KEY.delegatedSessionId) ?? "";
  const sessionIndex = ytcfg.get(YTCFG_KEY.sessionIndex) ?? "";
  const isContextComplete = videoId && clientNameNumber !== undefined && clientVersion !== undefined && innertubeContext !== undefined;
  if (!isContextComplete) {
    return null;
  }
  return { videoId, clientNameNumber, clientVersion, innertubeContext, delegatedSessionId, sessionIndex };
}

function getEmbedRateContext(): RateContext | null {
  const ytcfg = window.ytcfg;
  if (!ytcfg) {
    return null;
  }
  const videoId = getVideoId();
  const clientVersion = ytcfg.get(YTCFG_KEY.clientVersion);
  if (!videoId || !clientVersion) {
    return null;
  }
  const existingContext = ytcfg.get(YTCFG_KEY.innertubeContext);
  const minimalClient = {
    clientName: "WEB",
    clientVersion,
    ...existingContext?.client.hl && { hl: existingContext.client.hl },
    ...existingContext?.client.gl && { gl: existingContext.client.gl }
  };
  return {
    videoId,
    clientNameNumber: WEB_CLIENT_NAME_NUMBER,
    clientVersion,
    innertubeContext: { client: minimalClient },
    delegatedSessionId: ytcfg.get(YTCFG_KEY.delegatedSessionId) ?? "",
    sessionIndex: ytcfg.get(YTCFG_KEY.sessionIndex) ?? ""
  };
}

function extractRateParam(action: RateAction) {
  const data = Object.getOwnPropertyDescriptor(window, "ytInitialData")?.value;
  if (!data) {
    return undefined;
  }
  const targetField = paramFieldForAction[action];
  const stack: unknown[] = [data];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") {
      continue;
    }
    if (targetField in node) {
      const value = Object.getOwnPropertyDescriptor(node, targetField)?.value;
      if (typeof value === "string" && value) {
        return value;
      }
    }
    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return undefined;
}

async function rateVideoOnPage(action: RateAction) {
  const context = getRateContext();
  if (!context) {
    return { success: false, error: "No video context" };
  }
  const params = extractRateParam(action);
  if (!params) {
    return { success: false, error: "No rate params in ytInitialData" };
  }
  const Authorization = await buildSapisidAuthorization();
  if (!Authorization) {
    return { success: false, error: "No SAPISID cookie" };
  }
  try {
    const isOk = await executeRateRequest({ action, context, Authorization, params });
    if (!isOk) {
      return { success: false, error: "Rate request failed" };
    }
    return { success: true, videoId: context.videoId };
  } catch {
    return { success: false, error: "Rate request threw" };
  }
}

async function rateInEmbed(action: RateAction) {
  const context = getEmbedRateContext();
  if (!context) {
    return { success: false, error: "No embed context" };
  }
  const Authorization = await buildSapisidAuthorization();
  if (!Authorization) {
    return { success: false, error: "No SAPISID cookie" };
  }
  try {
    const params = await fetchRateParamsFromNext({ action, context, Authorization });
    if (!params) {
      return { success: false, error: "No rate params from /next" };
    }
    const isOk = await executeRateRequest({ action, context, Authorization, params });
    if (!isOk) {
      return { success: false, error: "Rate request failed" };
    }
    return { success: true, videoId: context.videoId };
  } catch {
    return { success: false, error: "Rate request threw" };
  }
}

function init() {
  ytrMessenger.onMessage(YtrMessage.rateVideo, ({ data }) => rateVideoOnPage(data));
  ytrMessenger.onMessage(YtrMessage.rateInEmbed, ({ data }) => rateInEmbed(data));
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://www.youtube-nocookie.com/*"],
  world: "MAIN",
  allFrames: true,
  main: () => init()
});
