import { innertubeContextSchema } from "@/lib/innertube";
import { YtcfgKey } from "@/lib/types";
import {
  getElementByMutationObserver,
  SELECTORS,
  YoutubeEvent,
  YoutubeHost,
  YoutubePathname
} from "@/lib/utils-initials";
import { type RateAction, rateActionSchema, type RateContext, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import { findRateParamInInnertube, RATE_PARAM_FIELD } from "@/lib/ytr-rate-fetch";
import { z } from "@/lib/zod";
import { createGuard } from "@/lib/zod-guard";

const isMoviePlayer = createGuard(
  z.looseObject({
    getVideoData: z.function({
      input: [],
      output: z.unknown()
    })
  })
);

const videoDataSchema = z.object({ video_id: z.string() });
const trailerPlayerSchema = z.object({ data: z.object({ videoId: z.string() }) });

function getPlayerVideoId() {
  const elPlayer: unknown = document.querySelector(SELECTORS.MOVIE_PLAYER);
  if (!isMoviePlayer(elPlayer)) {
    return "";
  }

  return videoDataSchema.safeParse(elPlayer.getVideoData()).data?.video_id ?? "";
}

function getVideoId() {
  const fromPlayer = getPlayerVideoId();
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
  return trailerPlayerSchema.safeParse(elTrailer).data?.data.videoId ?? "";
}

function readConfig<Schema extends z.ZodType>({ key, schema }: { key: YtcfgKey; schema: Schema }) {
  return schema.safeParse(window.ytcfg?.get(key)).data;
}

function getRateContext() {
  const videoId = getVideoId();
  const clientNameNumber = readConfig({
    key: YtcfgKey.CLIENT_NAME,
    schema: z.number()
  });
  const clientVersion = readConfig({
    key: YtcfgKey.CLIENT_VERSION,
    schema: z.string()
  });
  if (!videoId || clientNameNumber === undefined || !clientVersion) {
    return null;
  }

  const existingClient = readConfig({
    key: YtcfgKey.INNERTUBE_CONTEXT,
    schema: innertubeContextSchema
  })?.client;
  const delegatedSessionId = readConfig({
    key: YtcfgKey.DELEGATED_SESSION_ID,
    schema: z.string()
  });
  const sessionIndex = readConfig({
    key: YtcfgKey.SESSION_INDEX,
    schema: z.string()
  });
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
    delegatedSessionId: delegatedSessionId ?? "",
    sessionIndex: sessionIndex ?? ""
  } satisfies RateContext;
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
        field: RATE_PARAM_FIELD[action]
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
    document.querySelector<HTMLElement>(SELECTORS.MOVIE_PLAYER) ??
    (await getElementByMutationObserver(SELECTORS.MOVIE_PLAYER));

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
    ytrMessenger.onMessage(YtrMessage.GET_RATE_CONTEXT, ({ data }) => getContextForRate(rateActionSchema.parse(data)));
    void watchTrackVideoId();
  }
});
