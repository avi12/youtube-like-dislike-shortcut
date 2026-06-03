import { SubscriptionDecision } from "@/lib/ytr-subscription-signal";

interface SharedState {
  percentageWatched: number;
  lastTimeUpdate: number;
  isUserInteracted: boolean;
  isRatingResolved: boolean;
  isRatedInitially: boolean;
  isCurrentlyRated: boolean;
  isAdPlaying: boolean;
  isAdInitiallyPlaying: boolean;
  isLiveOrPremiere: boolean;
  isShorts: boolean;
  isAutoLikeEnabled: boolean;
  subscriptionDecision: SubscriptionDecision | undefined;
  hasMountedForCurrentNav: boolean;
  lastHref: string;
}

export const sharedState: SharedState = $state({
  percentageWatched: 0,
  lastTimeUpdate: 0,
  isUserInteracted: false,
  isRatingResolved: false,
  isRatedInitially: false,
  isCurrentlyRated: false,
  isAdPlaying: false,
  isAdInitiallyPlaying: false,
  isLiveOrPremiere: false,
  isShorts: false,
  isAutoLikeEnabled: false,
  subscriptionDecision: undefined,
  hasMountedForCurrentNav: false,
  lastHref: ""
});

export function getIsUnmountRequired() {
  if (!sharedState.isAutoLikeEnabled) {
    return true;
  }
  if (sharedState.isShorts || sharedState.isLiveOrPremiere) {
    return true;
  }
  if (sharedState.subscriptionDecision === SubscriptionDecision.claimed) {
    return true;
  }
  if (sharedState.isCurrentlyRated && !sharedState.isUserInteracted) {
    return true;
  }
  return sharedState.isAdInitiallyPlaying && sharedState.isAdPlaying;
}

export function getIsFreshMountAllowed() {
  if (getIsUnmountRequired()) {
    return false;
  }
  if (!sharedState.isRatingResolved) {
    return false;
  }
  if (sharedState.isRatedInitially || sharedState.isCurrentlyRated) {
    return false;
  }
  return !sharedState.isUserInteracted;
}

export function watchMountState(syncUi: () => void) {
  return $effect.root(() => {
    $effect(syncUi);
  });
}
