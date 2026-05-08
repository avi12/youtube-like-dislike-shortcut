import { type InnertubeContext, YTCFG_KEY } from "@/lib/types";
import { SELECTORS, YOUTUBE_PATHNAME } from "@/lib/utils-initials";
import { type RateAction, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";

enum LIKE_API_URLS {
  like = "/youtubei/v1/like/like",
  dislike = "/youtubei/v1/like/dislike",
  removelike = "/youtubei/v1/like/removelike"
}

enum LIKE_STATUSES {
  like = "LIKE",
  dislike = "DISLIKE",
  removelike = "INDIFFERENT"
}

const HEX_PAD_LENGTH = 2;
const MILLISECONDS_PER_SECOND = 1000;

interface YtdAppElement extends HTMLElement {
  resolveCommand: (cmd: unknown, ctx: unknown) => void;
}

interface MoviePlayerElement extends HTMLElement {
  getVideoData?: () => { video_id?: string } | undefined;
}

interface RateRequestBody {
  context: InnertubeContext;
  target: { videoId: string };
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
  if (!trailer || !("data" in trailer)) {
    return "";
  }
  const { data } = trailer;
  if (!data || typeof data !== "object" || !("videoId" in data) || !data.videoId) {
    return "";
  }
  return String(data.videoId);
}

function getVideoId() {
  if (location.pathname === YOUTUBE_PATHNAME.watch) {
    return getVideoIdFromPlayer();
  }
  if (location.pathname.startsWith(YOUTUBE_PATHNAME.embed)) {
    return getVideoIdFromPlayer() || getVideoIdFromEmbedUrl();
  }
  return getVideoIdFromChannelTrailer();
}

function rateViaResolveCommand(action: RateAction, videoId: string) {
  const ytdApp = document.querySelector<YtdAppElement>(SELECTORS.ytdApp);
  if (!ytdApp) {
    return false;
  }
  try {
    ytdApp.resolveCommand(
      {
        commandMetadata: {
          webCommandMetadata: {
            sendPost: true,
            apiUrl: LIKE_API_URLS[action]
          }
        },
        likeEndpoint: {
          status: LIKE_STATUSES[action],
          target: { videoId }
        }
      },
      {}
    );
    return true;
  } catch {
    return false;
  }
}

function getSapisidCookie() {
  const prefix = "SAPISID=";
  const cookieEntry = document.cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  return cookieEntry?.slice(prefix.length) ?? "";
}

async function getAuthorization() {
  const sapisid = getSapisidCookie();
  if (!sapisid) {
    return "";
  }
  const timestampSeconds = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
  const text = `${timestampSeconds} ${sapisid} ${location.origin}`;
  const buffer = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  const hash = Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(HEX_PAD_LENGTH, "0"))
    .join("");
  return `SAPISIDHASH ${timestampSeconds}_${hash}`;
}

async function rateViaFetch(action: RateAction, videoId: string) {
  const { ytcfg } = window;
  if (!ytcfg) {
    return false;
  }
  const Authorization = await getAuthorization();
  if (!Authorization) {
    return false;
  }
  const clientName = ytcfg.get(YTCFG_KEY.clientName);
  const clientVersion = ytcfg.get(YTCFG_KEY.clientVersion);
  const context = ytcfg.get(YTCFG_KEY.innertubeContext);
  if (clientName === undefined || clientVersion === undefined || context === undefined) {
    return false;
  }
  try {
    const response = await fetch(`${LIKE_API_URLS[action]}?prettyPrint=false`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization,
        "Content-Type": "application/json",
        "X-YouTube-Client-Name": String(clientName),
        "X-YouTube-Client-Version": clientVersion
      },
      body: JSON.stringify({
        context,
        target: { videoId }
      } satisfies RateRequestBody)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function rateVideoOnPage(action: RateAction) {
  const videoId = getVideoId();
  if (!videoId) {
    return {
      success: false,
      error: "No video ID found"
    };
  }
  if (rateViaResolveCommand(action, videoId)) {
    return {
      success: true,
      videoId
    };
  }
  if (await rateViaFetch(action, videoId)) {
    return {
      success: true,
      videoId
    };
  }
  return {
    success: false,
    error: "Failed to rate video"
  };
}

function init() {
  ytrMessenger.onMessage(YtrMessage.rateVideo, ({ data }) => rateVideoOnPage(data));
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  world: "MAIN",
  allFrames: true,
  main: () => init()
});
