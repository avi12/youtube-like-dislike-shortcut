import { defineCustomEventMessaging } from "@webext-core/messaging/page";

import { innertubeContextSchema } from "@/lib/innertube";
import { z } from "@/lib/zod";
import { createGuard } from "@/lib/zod-guard";

export enum RateAction {
  LIKE = "like",
  DISLIKE = "dislike",
  REMOVELIKE = "removelike"
}

export const rateActionSchema = z.enum(RateAction);

export enum YtrMessage {
  GET_RATE_CONTEXT = "ytr-rate:getRateContext",
  TRACK_VIDEO_ID_CHANGED = "ytr-rate:trackVideoIdChanged"
}

const rateResultSchema = z.object({
  success: z.boolean(),
  videoId: z.string().optional(),
  error: z.string().optional()
});

const rateContextSchema = z.object({
  videoId: z.string(),
  clientNameNumber: z.number(),
  clientVersion: z.string(),
  innertubeContext: innertubeContextSchema,
  delegatedSessionId: z.string(),
  sessionIndex: z.string()
});

export type RateContext = z.infer<typeof rateContextSchema>;

export const rateContextResultSchema = z.object({
  context: rateContextSchema,
  params: z.string().optional()
});

type RateContextResult = z.infer<typeof rateContextResultSchema>;

interface YtrProtocol {
  [YtrMessage.GET_RATE_CONTEXT]: (action: RateAction) => RateContextResult | null;
  [YtrMessage.TRACK_VIDEO_ID_CHANGED]: (videoId: string) => void;
}

export const ytrMessenger = defineCustomEventMessaging<YtrProtocol>({ namespace: "ytr" });

export const isRateRequest = createGuard(z.object({ action: rateActionSchema }));

export async function sendRateRequest(action: RateAction) {
  const response: unknown = await browser.runtime.sendMessage({ action });
  return rateResultSchema.parse(response);
}
