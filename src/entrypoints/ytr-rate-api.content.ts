import { YTCFG_KEY } from "@/lib/types";
import { SELECTORS, YOUTUBE_PATHNAME } from "@/lib/utils-initials";
import { RateAction, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import {
  executeRateRequest,
  fetchRateParamsFromNext,
  findRateParamInInnertube,
  type RateParamField
} from "@/lib/ytr-rate-fetch";
import { buildSapisidAuthorization } from "@/lib/ytr-sapisid";

const WEB_CLIENT_NAME_NUMBER = 1;

const paramFieldForAction: Record<RateAction, RateParamField> = {
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
  const [, videoId] = location.pathname.match(/^\/embed\/([^/?]+)/) ?? [];
  return videoId ?? "";
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
  const { pathname } = location;
  const isWatchPage = pathname === YOUTUBE_PATHNAME.watch;
  if (isWatchPage) {
    return getVideoIdFromPlayer();
  }
  const isEmbedPage = pathname.startsWith(YOUTUBE_PATHNAME.embed);
  if (isEmbedPage) {
    return getVideoIdFromPlayer() || getVideoIdFromEmbedUrl();
  }
  return getVideoIdFromChannelTrailer();
}

function getRateContext() {
  const { ytcfg } = window;
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

function getEmbedRateContext() {
  const { ytcfg } = window;
  if (!ytcfg) {
    return null;
  }
  const videoId = getVideoId();
  const clientVersion = ytcfg.get(YTCFG_KEY.clientVersion);
  if (!videoId || !clientVersion) {
    return null;
  }
  const existingClient = ytcfg.get(YTCFG_KEY.innertubeContext)?.client;
  const { hl, gl } = existingClient ?? {};
  const minimalClient = {
    clientName: "WEB",
    clientVersion,
    ...hl && { hl },
    ...gl && { gl }
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
  return findRateParamInInnertube(window.ytInitialData, paramFieldForAction[action]);
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
