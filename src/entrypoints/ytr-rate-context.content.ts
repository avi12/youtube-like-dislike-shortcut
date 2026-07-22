import { YTCFG_KEY } from "@/lib/types";
import { SELECTORS, YOUTUBE_PATHNAME } from "@/lib/utils-initials";
import { RateAction, type RateContext, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import { findRateParamInInnertube, type RateParamField } from "@/lib/ytr-rate-fetch";

const paramFieldForAction: Record<RateAction, RateParamField> = {
  [RateAction.like]: "likeParams",
  [RateAction.dislike]: "dislikeParams",
  [RateAction.removelike]: "removeLikeParams"
};

interface MoviePlayerElement extends HTMLElement {
  getVideoData?: () => { video_id?: string } | undefined;
}

function getVideoId() {
  const elPlayer = document.querySelector<MoviePlayerElement>(SELECTORS.moviePlayer);
  const fromPlayer = elPlayer?.getVideoData?.()?.video_id;
  if (fromPlayer) {
    return fromPlayer;
  }
  const [, embedVideoId] = location.pathname.match(/^\/embed\/([^/?]+)/) ?? [];
  if (embedVideoId) {
    return embedVideoId;
  }
  if (location.pathname === YOUTUBE_PATHNAME.watch) {
    return "";
  }
  const elTrailer = document.querySelector(SELECTORS.channelTrailerPlayer);
  const data = elTrailer && "data" in elTrailer ? elTrailer.data : undefined;
  return data && typeof data === "object" && "videoId" in data && data.videoId ? String(data.videoId) : "";
}

function getRateContext(): RateContext | null {
  const { ytcfg } = window;
  const videoId = getVideoId();
  const clientNameNumber = ytcfg?.get(YTCFG_KEY.clientName);
  const clientVersion = ytcfg?.get(YTCFG_KEY.clientVersion);
  const existingClient = ytcfg?.get(YTCFG_KEY.innertubeContext)?.client;
  if (!videoId || clientNameNumber === undefined || !clientVersion) {
    return null;
  }
  const { hl, gl } = existingClient ?? {};
  return {
    videoId,
    clientNameNumber,
    clientVersion,
    innertubeContext: {
      client: {
        clientName: existingClient?.clientName ?? "WEB",
        clientVersion,
        ...hl && { hl },
        ...gl && { gl }
      }
    },
    delegatedSessionId: ytcfg?.get(YTCFG_KEY.delegatedSessionId) ?? "",
    sessionIndex: ytcfg?.get(YTCFG_KEY.sessionIndex) ?? ""
  };
}

function getContextForRate(action: RateAction) {
  const context = getRateContext();
  if (!context) {
    return null;
  }
  const isEmbed = location.pathname.startsWith(YOUTUBE_PATHNAME.embed);
  return {
    context,
    ...!isEmbed && { params: findRateParamInInnertube(window.ytInitialData, paramFieldForAction[action]) }
  };
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://www.youtube-nocookie.com/*"],
  world: "MAIN",
  allFrames: true,
  main: () => ytrMessenger.onMessage(YtrMessage.getRateContext, ({ data }) => getContextForRate(data))
});
