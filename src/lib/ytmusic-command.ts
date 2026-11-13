export const enum PortName {
  MUSIC_SHORTCUT = "ytmusic-shortcut"
}

export enum MusicCommand {
  LIKE = "ytmusic-like",
  DISLIKE = "ytmusic-dislike",
  UNRATE = "ytmusic-unrate"
}

export interface MusicRateMessage {
  rate: boolean | null;
}

export interface MusicFocusMessage {
  isFocused: boolean;
}

export const rateForMusicCommand: Record<MusicCommand, boolean | null> = {
  [MusicCommand.LIKE]: true,
  [MusicCommand.DISLIKE]: false,
  [MusicCommand.UNRATE]: null
};

export function isMusicCommand(value: string): value is MusicCommand {
  return value === MusicCommand.LIKE || value === MusicCommand.DISLIKE || value === MusicCommand.UNRATE;
}
