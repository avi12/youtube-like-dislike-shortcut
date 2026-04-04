import { defineCustomEventMessaging } from "@webext-core/messaging/page";

export enum RateAction {
  like = "like",
  dislike = "dislike",
  removelike = "removelike"
}

interface RateResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

export enum YtrMessage {
  rateVideo = "rateVideo"
}

type YtrMessengerSchema = {
  [YtrMessage.rateVideo](action: RateAction): RateResult;
};

export const ytrMessenger = defineCustomEventMessaging<YtrMessengerSchema>({
  namespace: "ytr-rate"
});
