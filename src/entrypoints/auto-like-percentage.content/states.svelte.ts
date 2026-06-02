export const sharedState = $state({
  percentageWatched: 0,
  lastTimeUpdate: 0,
  isUserInteracted: false,
  isRatingResolved: false,
  isRatedInitially: false,
  isAdPlaying: false,
  isAdInitiallyPlaying: false,
  isLiveOrPremiere: false,
  isShorts: false,
  isAutoLikeEnabled: false,
  hasNavigated: false
});

function getIsDisplayPercentage() {
  const isAutoLikeEnabled = sharedState.isAutoLikeEnabled;
  if (!isAutoLikeEnabled) {
    return false;
  }
  if (!sharedState.hasNavigated) {
    return false;
  }
  const isShortsOrLive = sharedState.isShorts || sharedState.isLiveOrPremiere;
  if (isShortsOrLive) {
    return false;
  }
  const isRatingPendingAndUnrated = sharedState.isRatingResolved && !sharedState.isRatedInitially;
  if (!isRatingPendingAndUnrated) {
    return false;
  }
  return !sharedState.isAdInitiallyPlaying || !sharedState.isAdPlaying;
}

export function watchDisplayPercentage(onChange: (isDisplay: boolean) => void) {
  return $effect.root(() => {
    $effect(() => {
      onChange(getIsDisplayPercentage());
    });
  });
}
