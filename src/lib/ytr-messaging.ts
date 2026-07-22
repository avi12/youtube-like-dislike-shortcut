import { defineCustomEventMessaging } from "@webext-core/messaging/page";
import { type InnertubeContext } from "@/lib/types";

export enum RateAction {
  like = "like",
  dislike = "dislike",
  removelike = "removelike"
}

export enum YtrMessage {
  getRateContext = "ytr-rate:getRateContext"
}

export interface RateResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

export interface RateContextResult {
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

type YtrProtocol = {
  [YtrMessage.getRateContext]: (action: RateAction) => RateContextResult | null;
};

export const ytrMessenger = defineCustomEventMessaging<YtrProtocol>({ namespace: "ytr" });

export interface RateRequest {
  action: RateAction;
}

export function isRateRequest(message: unknown): message is RateRequest {
  return typeof message === "object" && message !== null && "action" in message
    && (message.action === RateAction.like || message.action === RateAction.dislike || message.action === RateAction.removelike);
}

export function sendRateRequest(action: RateAction) {
  return browser.runtime.sendMessage<RateRequest, RateResult>({ action });
}
