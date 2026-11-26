import {
  type ButtonViewModelContainer,
  type InnertubeContext,
  type RateParamField,
  type ToggleButtonViewModelContainer,
  watchDataSchema
} from "@/lib/innertube";
import { RateAction, type RateContext } from "@/lib/ytr-messaging";

const LIKE_API_URLS: Record<RateAction, string> = {
  [RateAction.LIKE]: "/youtubei/v1/like/like",
  [RateAction.DISLIKE]: "/youtubei/v1/like/dislike",
  [RateAction.REMOVELIKE]: "/youtubei/v1/like/removelike"
};

const NEXT_API_URL = "/youtubei/v1/next";

export const RATE_PARAM_FIELD: Record<RateAction, RateParamField> = {
  [RateAction.LIKE]: "likeParams",
  [RateAction.DISLIKE]: "dislikeParams",
  [RateAction.REMOVELIKE]: "removeLikeParams"
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

function buildHeaders({ Authorization, context }: { Authorization: string; context: RateContext }) {
  const { clientNameNumber, clientVersion, sessionIndex, delegatedSessionId } = context;
  return {
    Authorization,
    "Content-Type": "application/json",
    "X-YouTube-Client-Name": String(clientNameNumber),
    "X-YouTube-Client-Version": clientVersion,
    "X-Origin": "https://www.youtube.com",
    ...(sessionIndex && {
      "X-Goog-AuthUser": sessionIndex
    }),
    ...(delegatedSessionId && {
      "X-Goog-PageId": delegatedSessionId
    })
  };
}

function pickParamFromButtonContainer({
  container,
  field
}: {
  container: ButtonViewModelContainer | undefined;
  field: RateParamField;
}) {
  const { commands = [] } = container?.buttonViewModel?.onTap?.serialCommand ?? {};
  for (const command of commands) {
    const { innertubeCommand } = command;
    const direct = innertubeCommand?.likeEndpoint?.[field];
    if (direct) {
      return direct;
    }

    const nested =
      innertubeCommand?.modalEndpoint?.modal?.modalWithTitleAndButtonRenderer?.button?.buttonRenderer
        ?.navigationEndpoint?.signInEndpoint?.nextEndpoint?.likeEndpoint?.[field];
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function pickParamFromToggle({
  container,
  field
}: {
  container: ToggleButtonViewModelContainer | undefined;
  field: RateParamField;
}) {
  const inner = container?.toggleButtonViewModel?.toggleButtonViewModel;
  return (
    pickParamFromButtonContainer({
      container: inner?.defaultButtonViewModel,
      field
    }) ??
    pickParamFromButtonContainer({
      container: inner?.toggledButtonViewModel,
      field
    })
  );
}

export function findRateParamInInnertube({ root, field }: { root: unknown; field: RateParamField }) {
  const { data } = watchDataSchema.safeParse(root);
  if (!data) {
    return undefined;
  }

  const { contents: rootContents, playerOverlays } = data;
  const { contents = [] } = rootContents?.twoColumnWatchNextResults?.results?.results ?? {};
  for (const content of contents) {
    const { topLevelButtons = [] } = content.videoPrimaryInfoRenderer?.videoActions?.menuRenderer ?? {};
    for (const button of topLevelButtons) {
      const { likeButtonViewModel, dislikeButtonViewModel } = button.segmentedLikeDislikeButtonViewModel ?? {};
      const fromLike = pickParamFromToggle({
        container: likeButtonViewModel?.likeButtonViewModel,
        field
      });
      if (fromLike) {
        return fromLike;
      }

      const fromDislike = pickParamFromToggle({
        container: dislikeButtonViewModel?.dislikeButtonViewModel,
        field
      });
      if (fromDislike) {
        return fromDislike;
      }
    }
  }
  const { quickActionButtons = [] } =
    playerOverlays?.playerOverlayRenderer?.fullscreenQuickActionsBar?.quickActionsViewModel ?? {};
  for (const quickButton of quickActionButtons) {
    const { likeButtonViewModel, dislikeButtonViewModel } = quickButton;
    const fromLike = pickParamFromToggle({
      container: likeButtonViewModel,
      field
    });
    if (fromLike) {
      return fromLike;
    }

    const fromDislike = pickParamFromToggle({
      container: dislikeButtonViewModel,
      field
    });
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
    headers: buildHeaders({
      Authorization,
      context
    }),
    body: JSON.stringify({
      context: innertubeContext,
      videoId
    } satisfies NextRequestBody)
  });
  if (!response.ok) {
    console.debug("[ytr-fetch] /next failed", response.status);
    return undefined;
  }

  const root: unknown = await response.json().catch(() => null);
  const param = findRateParamInInnertube({
    root,
    field: RATE_PARAM_FIELD[action]
  });
  console.debug("[ytr-fetch] /next", {
    action,
    hasParam: Boolean(param)
  });
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
    headers: buildHeaders({
      Authorization,
      context
    }),
    body: JSON.stringify({
      context: innertubeContext,
      target: {
        videoId
      },
      ...(params && {
        params
      })
    } satisfies RateRequestBody)
  });
  return response.ok;
}
