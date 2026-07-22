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
  clientVersion = "INNERTUBE_CONTEXT_CLIENT_VERSION",
  delegatedSessionId = "DELEGATED_SESSION_ID",
  sessionIndex = "SESSION_INDEX"
}

/**
 * Minimal subset of the Innertube request context we build. YouTube ships many
 * more fields on the real `INNERTUBE_CONTEXT` (request, user, clickTracking,
 * adSignalsInfo, etc.) but rate requests use only this allow-listed `client`.
 */
export interface InnertubeContext {
  client: {
    clientName: string;
    clientVersion: string;
    hl?: string;
    gl?: string;
  };
}

/**
 * Rate-endpoint payload (innertubeCommand.likeEndpoint). Field names confirmed
 * against real `ytInitialData` and `/youtubei/v1/next` responses via DevTools.
 */
interface LikeEndpoint {
  likeParams?: string;
  dislikeParams?: string;
  removeLikeParams?: string;
}

interface InnertubeCommand {
  likeEndpoint?: LikeEndpoint;
  modalEndpoint?: {
    modal?: {
      modalWithTitleAndButtonRenderer?: {
        button?: {
          buttonRenderer?: {
            navigationEndpoint?: {
              signInEndpoint?: {
                nextEndpoint?: InnertubeCommand;
              };
            };
          };
        };
      };
    };
  };
}

export interface ButtonViewModelContainer {
  buttonViewModel?: {
    onTap?: {
      serialCommand?: {
        commands?: { innertubeCommand?: InnertubeCommand }[];
      };
    };
  };
}

export interface ToggleButtonViewModelContainer {
  toggleButtonViewModel?: {
    toggleButtonViewModel?: {
      defaultButtonViewModel?: ButtonViewModelContainer;
      toggledButtonViewModel?: ButtonViewModelContainer;
    };
  };
}

interface SegmentedLikeDislikeButton {
  likeButtonViewModel?: { likeButtonViewModel?: ToggleButtonViewModelContainer };
  dislikeButtonViewModel?: { dislikeButtonViewModel?: ToggleButtonViewModelContainer };
}

interface QuickActionButton {
  likeButtonViewModel?: ToggleButtonViewModelContainer;
  dislikeButtonViewModel?: ToggleButtonViewModelContainer;
}

export interface YtInitialData {
  contents?: {
    twoColumnWatchNextResults?: {
      results?: {
        results?: {
          contents?: {
            videoPrimaryInfoRenderer?: {
              videoActions?: {
                menuRenderer?: {
                  topLevelButtons?: {
                    segmentedLikeDislikeButtonViewModel?: SegmentedLikeDislikeButton;
                  }[];
                };
              };
            };
          }[];
        };
      };
    };
  };
  playerOverlays?: {
    playerOverlayRenderer?: {
      fullscreenQuickActionsBar?: {
        quickActionsViewModel?: {
          quickActionButtons?: QuickActionButton[];
        };
      };
    };
  };
}

/**
 * Shape of `/youtubei/v1/next` responses (same top-level structure as
 * `ytInitialData` on the watch page).
 */
export type InnertubeNextResponse = YtInitialData;

/**
 * Overload signatures for `ytcfg.get(...)` so each known key returns its precise value type.
 * Reverse-engineered from observation — YouTube publishes no official documentation.
 */
interface YtcfgGetter {
  (key: YTCFG_KEY.innertubeContext): InnertubeContext | undefined;
  (key: YTCFG_KEY.clientName): number | undefined;
  (key: YTCFG_KEY.clientVersion): string | undefined;
  (key: YTCFG_KEY.delegatedSessionId): string | undefined;
  (key: YTCFG_KEY.sessionIndex): string | undefined;
}

declare global {
  interface Window {
    ytrUserInteracted: boolean;
    ytrAutoLikeEnabled: typeof initial.isAutoLike;
    ytrAutoLikeThreshold: typeof initial.autoLikeThreshold;
    ytrLastButtonTriggers: typeof initial.buttonTriggers;
    ytcfg?: { get: YtcfgGetter };
    ytInitialData?: YtInitialData;
  }
}
