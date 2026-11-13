import { defineCustomEventMessaging } from "@webext-core/messaging/page";

import { type InnertubeContext } from "@/lib/types";

export enum RateAction {
  LIKE = "like",
  DISLIKE = "dislike",
  REMOVELIKE = "removelike"
}

export enum YtrMessage {
  GET_RATE_CONTEXT = "ytr-rate:getRateContext",
  TRACK_VIDEO_ID_CHANGED = "ytr-rate:trackVideoIdChanged"
}

interface RateResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

interface RateContextResult {
  context: RateContext;
  params?: string;
}

export interface RateContext {
  videoId: string;
  clientNameNumber: number;
  clientVersion: string;
  innertubeContext: InnertubeContext;
  delegatedSessionId: string;
  sessionIndex: string;
}

interface YtrProtocol {
  [YtrMessage.GET_RATE_CONTEXT]: (action: RateAction) => RateContextResult | null;
  [YtrMessage.TRACK_VIDEO_ID_CHANGED]: (videoId: string) => void;
}

export const ytrMessenger = defineCustomEventMessaging<YtrProtocol>({ namespace: "ytr" });

export interface RateRequest {
  action: RateAction;
}

export function isRateRequest(message: unknown): message is RateRequest {
  return (
    typeof message === "object" &&
    message !== null &&
    "action" in message &&
    (message.action === RateAction.LIKE ||
      message.action === RateAction.DISLIKE ||
      message.action === RateAction.REMOVELIKE)
  );
}

export function sendRateRequest(action: RateAction) {
  return browser.runtime.sendMessage<RateRequest, RateResult>({ action });
}
