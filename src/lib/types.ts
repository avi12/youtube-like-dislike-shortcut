import { type initial } from "@/lib/utils-initials";

export const enum Rating {
  LIKE = "like",
  DISLIKE = "dislike"
}

/**
 * Keys recognised by YouTube's `ytcfg.get(...)` configuration store on the embed
 * and watch pages. Names match the literal keys YouTube ships in the page bootstrap.
 * Reverse-engineered from observation - YouTube publishes no official documentation
 * for Innertube and these key names occasionally change.
 */
export enum YtcfgKey {
  INNERTUBE_CONTEXT = "INNERTUBE_CONTEXT",
  CLIENT_NAME = "INNERTUBE_CONTEXT_CLIENT_NAME",
  CLIENT_VERSION = "INNERTUBE_CONTEXT_CLIENT_VERSION",
  DELEGATED_SESSION_ID = "DELEGATED_SESSION_ID",
  SESSION_INDEX = "SESSION_INDEX"
}

declare global {
  interface Window {
    ytrUserInteracted: boolean;
    ytrAutoLikeEnabled: typeof initial.isAutoLike;
    ytrAutoLikeThreshold: typeof initial.autoLikeThreshold;
    ytrLastButtonTriggers: typeof initial.buttonTriggers;
    ytcfg?: { get: (key: YtcfgKey) => unknown };
    ytInitialData?: unknown;
  }
}
