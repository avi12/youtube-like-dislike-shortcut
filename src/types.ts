export type Modifier = "shiftKey" | "ctrlKey" | "altKey" | "metaKey";

export interface ButtonTrigger {
  primary: string;
  modifiers: Modifier[];
  secondary: string;
}

export interface ButtonTriggers {
  like: ButtonTrigger;
  dislike: ButtonTrigger;
  unrate: ButtonTrigger;
}

export type SupportedActions = "like" | "dislike" | "unrate";
export type RecordingType = SupportedActions | null;
declare global {
  interface Window {
    ytrUserInteracted: boolean;
  }
}
