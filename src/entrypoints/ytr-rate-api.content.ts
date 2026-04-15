import { type RateAction, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";

enum LIKE_API_URLS {
  like = "/youtubei/v1/like/like",
  dislike = "/youtubei/v1/like/dislike",
  removelike = "/youtubei/v1/like/removelike"
}

interface YtdAppElement extends HTMLElement {
  resolveCommand: (cmd: unknown, ctx: unknown) => void;
}

enum LIKE_STATUSES {
  like = "LIKE",
  dislike = "DISLIKE",
  removelike = "INDIFFERENT"
}

function getVideoId() {
  const isWatchPage = location.pathname === "/watch";

  if (isWatchPage) {
    const player = document.getElementById("movie_player");
    if (player && "getVideoData" in player) {
      const { getVideoData } = player;
      if (typeof getVideoData === "function") {
        const videoId = getVideoData.call(player)?.video_id;
        if (videoId) {
          return String(videoId);
        }
      }
    }
  }

  const channelTrailer = document.querySelector("ytd-channel-video-player-renderer");
  if (channelTrailer && "data" in channelTrailer) {
    const { data } = channelTrailer;
    if (data && typeof data === "object" && "videoId" in data && data.videoId) {
      return String(data.videoId);
    }
  }

  return "";
}

function rateVideoViaResolveCommand(action: RateAction) {
  const videoId = getVideoId();
  if (!videoId) {
    return { success: false, error: "No video ID found" };
  }

  try {
    const ytdApp = document.querySelector<YtdAppElement>("ytd-app")!;
    ytdApp.resolveCommand(
      {
        commandMetadata: {
          webCommandMetadata: { sendPost: true, apiUrl: LIKE_API_URLS[action] }
        },
        likeEndpoint: {
          status: LIKE_STATUSES[action],
          target: { videoId }
        }
      },
      {}
    );
    return { success: true, videoId };
  } catch {
    return { success: false, error: "ytd-app.resolveCommand not available" };
  }
}

function init() {
  ytrMessenger.onMessage(YtrMessage.rateVideo, ({ data }) => rateVideoViaResolveCommand(data));
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  world: "MAIN",
  allFrames: true,
  main: () => init()
});
