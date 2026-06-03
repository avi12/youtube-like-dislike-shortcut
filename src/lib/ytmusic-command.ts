export const enum PortName {
  musicShortcut = "ytmusic-shortcut"
}

export enum MusicCommand {
  like = "ytmusic-like",
  dislike = "ytmusic-dislike",
  unrate = "ytmusic-unrate"
}

export interface MusicRateMessage {
  rate: boolean | null;
}

export interface MusicFocusMessage {
  isFocused: boolean;
}

export const rateForMusicCommand: Record<MusicCommand, boolean | null> = {
  [MusicCommand.like]: true,
  [MusicCommand.dislike]: false,
  [MusicCommand.unrate]: null
};

export function isMusicCommand(value: string): value is MusicCommand {
  return value === MusicCommand.like || value === MusicCommand.dislike || value === MusicCommand.unrate;
}
