import { z } from "./zod";
import { createGuard } from "./zod-guard";

export const enum PortName {
  MUSIC_SHORTCUT = "ytmusic-shortcut"
}

export enum MusicCommand {
  LIKE = "ytmusic-like",
  DISLIKE = "ytmusic-dislike",
  UNRATE = "ytmusic-unrate"
}

const musicRateMessageSchema = z.object({ rate: z.boolean().nullable() });
const musicFocusMessageSchema = z.object({ isFocused: z.boolean() });

export type MusicRateMessage = z.infer<typeof musicRateMessageSchema>;
export type MusicFocusMessage = z.infer<typeof musicFocusMessageSchema>;

export const isMusicRateMessage = createGuard(musicRateMessageSchema);
export const isMusicFocusMessage = createGuard(musicFocusMessageSchema);

export const rateForMusicCommand: Record<MusicCommand, boolean | null> = {
  [MusicCommand.LIKE]: true,
  [MusicCommand.DISLIKE]: false,
  [MusicCommand.UNRATE]: null
};

export const isMusicCommand = createGuard(z.enum(MusicCommand));
