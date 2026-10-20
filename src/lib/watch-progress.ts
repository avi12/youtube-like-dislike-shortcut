const MAXIMUM_REAL_SECONDS_BETWEEN_TIME_UPDATES = 1;

export function getWatchedSeconds(previousTime: number, currentTime: number, playbackRate: number) {
  const delta = currentTime - previousTime;
  const maximumDelta = MAXIMUM_REAL_SECONDS_BETWEEN_TIME_UPDATES * Math.max(playbackRate, 1);
  const isContinuousPlayback = delta > 0 && delta < maximumDelta;
  return isContinuousPlayback ? delta : 0;
}
