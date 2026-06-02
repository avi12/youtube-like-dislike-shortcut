import { type InnertubeContext } from "@/lib/types";
import { RateAction, type RateContext } from "@/lib/ytr-messaging";

const LIKE_API_URLS: Record<RateAction, string> = {
  [RateAction.like]: "/youtubei/v1/like/like",
  [RateAction.dislike]: "/youtubei/v1/like/dislike",
  [RateAction.removelike]: "/youtubei/v1/like/removelike"
};

const NEXT_API_URL = "/youtubei/v1/next";

const RATE_PARAM_FIELD: Record<RateAction, string> = {
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
  return {
    Authorization,
    "Content-Type": "application/json",
    "X-YouTube-Client-Name": String(context.clientNameNumber),
    "X-YouTube-Client-Version": context.clientVersion,
    "X-Origin": "https://www.youtube.com",
    ...context.sessionIndex && { "X-Goog-AuthUser": context.sessionIndex },
    ...context.delegatedSessionId && { "X-Goog-PageId": context.delegatedSessionId }
  };
}

function findParamInResponse(parsed: unknown, fieldName: string) {
  const stack: unknown[] = [parsed];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object") {
      continue;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === fieldName && typeof value === "string" && value) {
        return value;
      }
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return undefined;
}

export async function fetchRateParamsFromNext({
  action,
  context,
  Authorization,
  urlBase = ""
}: {
  action: RateAction;
  context: RateContext;
  Authorization: string;
  urlBase?: string;
}) {
  const response = await fetch(`${urlBase}${NEXT_API_URL}?prettyPrint=false`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders({ Authorization, context }),
    body: JSON.stringify({
      context: context.innertubeContext,
      videoId: context.videoId
    } satisfies NextRequestBody)
  });
  if (!response.ok) {
    console.debug("[ytr-fetch] /next failed", response.status);
    return undefined;
  }
  const parsed = await response.json().catch(() => null);
  const param = findParamInResponse(parsed, RATE_PARAM_FIELD[action]);
  console.debug("[ytr-fetch] /next", { action, hasParam: Boolean(param) });
  return param;
}

export async function executeRateRequest({
  action,
  context,
  Authorization,
  params,
  urlBase = ""
}: {
  action: RateAction;
  context: RateContext;
  Authorization: string;
  params?: string;
  urlBase?: string;
}) {
  const response = await fetch(`${urlBase}${LIKE_API_URLS[action]}?prettyPrint=false`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders({ Authorization, context }),
    body: JSON.stringify({
      context: context.innertubeContext,
      target: { videoId: context.videoId },
      ...params && { params }
    } satisfies RateRequestBody)
  });
  const isOk = response.ok;
  const status = response.status;
  void response.text().then(text => {
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch { /* ignore */ }
    const summary = parsed ? {
      hasFrameworkUpdates: Boolean(parsed.frameworkUpdates),
      mutationCount: parsed.frameworkUpdates?.entityBatchUpdate?.mutations?.length ?? 0,
      mutationKinds: parsed.frameworkUpdates?.entityBatchUpdate?.mutations?.map((mutation: { payload?: Record<string, unknown> }) => Object.keys(mutation.payload ?? {})) ?? [],
      hasActions: Boolean(parsed.actions),
      responseId: parsed.responseContext?.responseId,
      bodyLength: text.length
    } : { rawBodySample: text.slice(0, 400) };
    console.debug("[ytr-fetch] response", isOk, status, JSON.stringify(summary));
  }).catch(() => undefined);
  return isOk;
}
