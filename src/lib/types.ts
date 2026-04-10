import { type initial } from "@/lib/utils-initials";

export type Modifier = "shiftKey" | "ctrlKey" | "altKey" | "metaKey";

export const enum Rating {
  Like = "like",
  Dislike = "dislike"
}

export type ButtonTrigger = {
  primary: string[];
  modifiers: Modifier[];
  secondary: boolean;
};

export type ButtonTriggers = {
  like: ButtonTrigger;
  dislike: ButtonTrigger;
  unrate: ButtonTrigger;
};

declare global {
  interface Window {
    ytrUserInteracted: boolean;
    ytrAutoLikeEnabled: typeof initial.isAutoLike;
    ytrAutoLikeThreshold: typeof initial.autoLikeThreshold;
    ytrAutoLikeSubscribedChannels: typeof initial.isAutoLikeSubscribedChannels;
    ytrLastButtonTriggers: typeof initial.buttonTriggers;
    ytrLastUrl: string;
    ytrLastTitle: string;
  }
}
