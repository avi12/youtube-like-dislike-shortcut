import { YtcfgKey } from "@/lib/types";
import {
  getElementByMutationObserver,
  SELECTORS,
  YoutubeEvent,
  YoutubeHost,
  YoutubePathname
} from "@/lib/utils-initials";
import { RateAction, type RateContext, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import { findRateParamInInnertube, type RateParamField } from "@/lib/ytr-rate-fetch";

const paramFieldForAction: Record<RateAction, RateParamField> = {
  [RateAction.LIKE]: "likeParams",
  [RateAction.DISLIKE]: "dislikeParams",
  [RateAction.REMOVELIKE]: "removeLikeParams"
};

interface MoviePlayerElement extends HTMLElement {
  getVideoData?: () => { video_id?: string } | undefined;
}

function getVideoId() {
  const elPlayer = document.querySelector<MoviePlayerElement>(SELECTORS.MOVIE_PLAYER);
  const fromPlayer = elPlayer?.getVideoData?.()?.video_id;
  if (fromPlayer) {
    return fromPlayer;
  }

  const [, embedVideoId] = location.pathname.match(/^\/embed\/([^/?]+)/) ?? [];
  if (embedVideoId) {
    return embedVideoId;
  }

  if (location.pathname === YoutubePathname.WATCH) {
    return "";
  }

  const elTrailer = document.querySelector(SELECTORS.CHANNEL_TRAILER_PLAYER);
  const data = elTrailer && "data" in elTrailer ? elTrailer.data : undefined;
  return data && typeof data === "object" && "videoId" in data && data.videoId ? String(data.videoId) : "";
}

function getRateContext(): RateContext | null {
  const { ytcfg } = window;
  const videoId = getVideoId();
  const clientNameNumber = ytcfg?.get(YtcfgKey.CLIENT_NAME);
  const clientVersion = ytcfg?.get(YtcfgKey.CLIENT_VERSION);
  const existingClient = ytcfg?.get(YtcfgKey.INNERTUBE_CONTEXT)?.client;
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
        ...(hl && {
          hl
        }),
        ...(gl && {
          gl
        })
      }
    },
    delegatedSessionId: ytcfg?.get(YtcfgKey.DELEGATED_SESSION_ID) ?? "",
    sessionIndex: ytcfg?.get(YtcfgKey.SESSION_INDEX) ?? ""
  };
}

function getContextForRate(action: RateAction) {
  const context = getRateContext();
  if (!context) {
    return null;
  }

  const isEmbed = location.pathname.startsWith(YoutubePathname.EMBED);
  return {
    context,
    ...(!isEmbed && {
      params: findRateParamInInnertube({
        root: window.ytInitialData,
        field: paramFieldForAction[action]
      })
    })
  };
}

// YouTube Music streams a whole queue through one media element and fires no navigation
// event between tracks, so the isolated world can only learn of a new track from the
// player's own data-change event, which fires here with the new video id already in place
async function watchTrackVideoId() {
  const isMusicTopFrame = location.hostname === YoutubeHost.MUSIC && self === top;
  if (!isMusicTopFrame) {
    return;
  }

  const elPlayer =
    document.querySelector<MoviePlayerElement>(SELECTORS.MOVIE_PLAYER) ??
    (await getElementByMutationObserver<MoviePlayerElement>(SELECTORS.MOVIE_PLAYER));

  let lastVideoId = "";
  function pushIfTrackChanged() {
    const videoId = getVideoId();
    const isSameTrack = !videoId || videoId === lastVideoId;
    if (isSameTrack) {
      return;
    }

    lastVideoId = videoId;
    ytrMessenger.sendMessage(YtrMessage.TRACK_VIDEO_ID_CHANGED, videoId).catch(() => {});
  }

  elPlayer.addEventListener(YoutubeEvent.VIDEO_DATA_CHANGE, pushIfTrackChanged);
  pushIfTrackChanged();
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*", "https://www.youtube-nocookie.com/*", "https://music.youtube.com/*"],
  world: "MAIN",
  allFrames: true,
  main() {
    ytrMessenger.onMessage(YtrMessage.GET_RATE_CONTEXT, ({ data }) => getContextForRate(data));
    void watchTrackVideoId();
  }
});
