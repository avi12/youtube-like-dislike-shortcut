import {
  type ButtonViewModelContainer,
  type InnertubeContext,
  type InnertubeNextResponse,
  type ToggleButtonViewModelContainer,
  type YtInitialData
} from "@/lib/types";
import { RateAction, type RateContext } from "@/lib/ytr-messaging";

const LIKE_API_URLS: Record<RateAction, string> = {
  [RateAction.like]: "/youtubei/v1/like/like",
  [RateAction.dislike]: "/youtubei/v1/like/dislike",
  [RateAction.removelike]: "/youtubei/v1/like/removelike"
};

const NEXT_API_URL = "/youtubei/v1/next";

export type RateParamField = "likeParams" | "dislikeParams" | "removeLikeParams";

const RATE_PARAM_FIELD: Record<RateAction, RateParamField> = {
  [RateAction.like]: "likeParams",
  [RateAction.dislike]: "dislikeParams",
  [RateAction.removelike]: "removeLikeParams"
};

interface RateRequestBody {
  context: InnertubeContext;
  target: { videoId: string };
  params?: string;
}

interface NextRequestBody {
  context: InnertubeContext;
  videoId: string;
}

function buildHeaders({
  Authorization,
  context
}: {
  Authorization: string;
  context: RateContext;
}) {
  const { clientNameNumber, clientVersion, sessionIndex, delegatedSessionId } = context;
  return {
    Authorization,
    "Content-Type": "application/json",
    "X-YouTube-Client-Name": String(clientNameNumber),
    "X-YouTube-Client-Version": clientVersion,
    "X-Origin": "https://www.youtube.com",
    ...sessionIndex && { "X-Goog-AuthUser": sessionIndex },
    ...delegatedSessionId && { "X-Goog-PageId": delegatedSessionId }
  };
}

function pickParamFromButtonContainer(container: ButtonViewModelContainer | undefined, field: RateParamField) {
  const { commands = [] } = container?.buttonViewModel?.onTap?.serialCommand ?? {};
  for (const command of commands) {
    const { innertubeCommand } = command;
    const direct = innertubeCommand?.likeEndpoint?.[field];
    if (direct) {
      return direct;
    }
    const nested = innertubeCommand?.modalEndpoint?.modal?.modalWithTitleAndButtonRenderer?.button?.buttonRenderer?.navigationEndpoint?.signInEndpoint?.nextEndpoint?.likeEndpoint?.[field];
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function pickParamFromToggle(container: ToggleButtonViewModelContainer | undefined, field: RateParamField) {
  const inner = container?.toggleButtonViewModel?.toggleButtonViewModel;
  return pickParamFromButtonContainer(inner?.defaultButtonViewModel, field)
    ?? pickParamFromButtonContainer(inner?.toggledButtonViewModel, field);
}

export function findRateParamInInnertube(root: YtInitialData | InnertubeNextResponse | undefined, field: RateParamField) {
  if (!root) {
    return undefined;
  }
  const { contents: rootContents, playerOverlays } = root;
  const { contents = [] } = rootContents?.twoColumnWatchNextResults?.results?.results ?? {};
  for (const content of contents) {
    const { topLevelButtons = [] } = content.videoPrimaryInfoRenderer?.videoActions?.menuRenderer ?? {};
    for (const button of topLevelButtons) {
      const { likeButtonViewModel, dislikeButtonViewModel } = button.segmentedLikeDislikeButtonViewModel ?? {};
      const fromLike = pickParamFromToggle(likeButtonViewModel?.likeButtonViewModel, field);
      if (fromLike) {
        return fromLike;
      }
      const fromDislike = pickParamFromToggle(dislikeButtonViewModel?.dislikeButtonViewModel, field);
      if (fromDislike) {
        return fromDislike;
      }
    }
  }
  const { quickActionButtons = [] } = playerOverlays?.playerOverlayRenderer?.fullscreenQuickActionsBar?.quickActionsViewModel ?? {};
  for (const quickButton of quickActionButtons) {
    const { likeButtonViewModel, dislikeButtonViewModel } = quickButton;
    const fromLike = pickParamFromToggle(likeButtonViewModel, field);
    if (fromLike) {
      return fromLike;
    }
    const fromDislike = pickParamFromToggle(dislikeButtonViewModel, field);
    if (fromDislike) {
      return fromDislike;
    }
  }
  return undefined;
}

export async function fetchRateParamsFromNext({
  action,
  context,
  Authorization
}: {
  action: RateAction;
  context: RateContext;
  Authorization: string;
}) {
  const { innertubeContext, videoId } = context;
  const response = await fetch(`${NEXT_API_URL}?prettyPrint=false`, {
    method: "POST",
    headers: buildHeaders({ Authorization, context }),
    body: JSON.stringify({
      context: innertubeContext,
      videoId
    } satisfies NextRequestBody)
  });
  if (!response.ok) {
    console.debug("[ytr-fetch] /next failed", response.status);
    return undefined;
  }
  const parsed: InnertubeNextResponse | null = await response.json().catch(() => null);
  const param = findRateParamInInnertube(parsed ?? undefined, RATE_PARAM_FIELD[action]);
  console.debug("[ytr-fetch] /next", { action, hasParam: Boolean(param) });
  return param;
}

export async function executeRateRequest({
  action,
  context,
  Authorization,
  params
}: {
  action: RateAction;
  context: RateContext;
  Authorization: string;
  params?: string;
}) {
  const { innertubeContext, videoId } = context;
  const response = await fetch(`${LIKE_API_URLS[action]}?prettyPrint=false`, {
    method: "POST",
    headers: buildHeaders({ Authorization, context }),
    body: JSON.stringify({
      context: innertubeContext,
      target: { videoId },
      ...params && { params }
    } satisfies RateRequestBody)
  });
  return response.ok;
}
