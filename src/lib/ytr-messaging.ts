import { defineCustomEventMessaging } from "@webext-core/messaging/page";
import { type InnertubeContext } from "@/lib/types";

export enum RateAction {
  like = "like",
  dislike = "dislike",
  removelike = "removelike"
}

export enum YtrMessage {
  rateVideo = "ytr-rate:rateVideo",
  rateInEmbed = "ytr-rate:rateInEmbed"
}

interface RateResult {
  success: boolean;
  videoId?: string;
  error?: string;
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
  [YtrMessage.rateVideo]: (action: RateAction) => RateResult;
  [YtrMessage.rateInEmbed]: (action: RateAction) => RateResult;
};

export const ytrMessenger = defineCustomEventMessaging<YtrProtocol>({ namespace: "ytr" });
