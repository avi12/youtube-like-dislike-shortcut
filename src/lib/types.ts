import { type initial } from "@/lib/utils-initials";

/**
 * Boolean modifier-key properties on a KeyboardEvent.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent#modifier_keys
 */
export type Modifier = "shiftKey" | "ctrlKey" | "altKey" | "metaKey";

export const enum Rating {
  Like = "like",
  Dislike = "dislike"
}

type ButtonTrigger = {
  primary: string[];
  modifiers: Modifier[];
  secondary: boolean;
};

export type ButtonTriggers = {
  like: ButtonTrigger;
  dislike: ButtonTrigger;
  unrate: ButtonTrigger;
};

/**
 * Keys recognised by YouTube's `ytcfg.get(...)` configuration store on the embed
 * and watch pages. Names match the literal keys YouTube ships in the page bootstrap.
 * Reverse-engineered from observation — YouTube publishes no official documentation
 * for Innertube and these key names occasionally change.
 */
export enum YTCFG_KEY {
  innertubeContext = "INNERTUBE_CONTEXT",
  clientName = "INNERTUBE_CONTEXT_CLIENT_NAME",
  clientVersion = "INNERTUBE_CONTEXT_CLIENT_VERSION"
}

/**
 * The `context` field expected by YouTube's internal Innertube API. We model the
 * fields we depend on (`client.clientName`/`clientVersion`) and use index signatures
 * for forward-compat with the additional fields YouTube ships (request, user,
 * clickTracking, etc.). Reverse-engineered from observation — YouTube publishes no
 * official documentation for Innertube.
 */
export interface InnertubeContext {
  client: {
    clientName: string;
    clientVersion: string;
    hl?: string;
    gl?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Overload signatures for `ytcfg.get(...)` so each known key returns its precise value type.
 * Reverse-engineered from observation — YouTube publishes no official documentation.
 */
interface YtcfgGetter {
  (key: YTCFG_KEY.innertubeContext): InnertubeContext | undefined;
  (key: YTCFG_KEY.clientName): number | undefined;
  (key: YTCFG_KEY.clientVersion): string | undefined;
}

declare global {
  interface Window {
    ytrUserInteracted: boolean;
    ytrAutoLikeEnabled: typeof initial.isAutoLike;
    ytrAutoLikeThreshold: typeof initial.autoLikeThreshold;
    ytrAutoLikeSubscribedChannels: typeof initial.isAutoLikeSubscribedChannels;
    ytrLastButtonTriggers: typeof initial.buttonTriggers;
    ytrLastUrl: string;
    ytrLastTitle: string;
    ytcfg?: { get: YtcfgGetter };
  }
}
