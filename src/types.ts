export type Modifier = "shiftKey" | "ctrlKey" | "altKey" | "metaKey";

export interface ButtonTrigger {
  primary: string[];
  modifiers: Modifier[];
  secondary: boolean;
}

export interface ButtonTriggers {
  like: ButtonTrigger;
  dislike: ButtonTrigger;
  unrate: ButtonTrigger;
}

export type SupportedActions = "like" | "dislike" | "unrate";

declare global {
  interface Window {
    ytrUserInteracted: boolean;
    ytrAutoLikeEnabled: boolean;
    ytrAutoLikeThreshold: number;
    ytrAutoLikeSubscribedChannels: boolean;
  }
}
