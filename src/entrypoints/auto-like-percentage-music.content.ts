import { mount, unmount } from "svelte";

import { storage } from "#imports";
import { getIsCurrentSurfaceEnabled, watchIsCurrentSurfaceEnabled } from "@/lib/surfaces";
import {
  DomAttribute,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey,
  UrlParam
} from "@/lib/utils-initials";
import { getWatchedSeconds } from "@/lib/watch-progress";
import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";
import { YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";
import { getSubscriptionDecision, onSubscriptionDecision } from "@/lib/ytr-subscription-signal";

import CsuiAutoLikePercent from "./auto-like-percentage.content/CsuiAutoLikePercent.svelte";
import {
  getIsFreshMountAllowed,
  getIsUnmountRequired,
  sharedState,
  watchMountState
} from "./auto-like-percentage.content/states.svelte";

let ratingWatchObserver: MutationObserver | null = null;
let trackSettleController: AbortController | null = null;
let isInitialRatingCheckPending = true;

function getIsAdPlaying() {
  return Boolean(document.querySelector(SELECTORS.AD_SHOWING_MUSIC));
}

// The whole queue streams through one MediaSource, so the video element keeps the same
// currentSrc and keeps its clock running across an automatic track change. Only the player
// itself knows which track started, pushed over from the main world by ytr-rate-context
let playerVideoId = "";

function getTrackVideoId() {
  if (playerVideoId) {
    return playerVideoId;
  }

  const elTrackLink = document.querySelector(SELECTORS.TRACK_LINK_MUSIC);
  if (!(elTrackLink instanceof HTMLAnchorElement)) {
    return "";
  }

  return new URLSearchParams(elTrackLink.search).get(UrlParam.VIDEO_ID) ?? "";
}

function getTrackDuration() {
  const elProgressBar = document.querySelector(SELECTORS.PROGRESS_BAR_MUSIC);
  const seconds =
    elProgressBar?.getAttribute(DomAttribute.ARIA_VALUE_MAX) ?? elProgressBar?.getAttribute(DomAttribute.MAX);
  return Number(seconds);
}

function watchForInitialRating() {
  ratingWatchObserver?.disconnect();
  ratingWatchObserver = null;
  trackSettleController?.abort();
  trackSettleController = null;

  sharedState.percentageWatched = 0;
  sharedState.lastTimeUpdate = 0;
  sharedState.isUserInteracted = false;
  sharedState.isRatingResolved = false;
  sharedState.isRatedInitially = false;
  sharedState.isCurrentlyRated = false;
  window.ytrUserInteracted = false;

  const anyButtonSelector = `${SELECTORS.TOGGLE_BUTTONS_MUSIC_VIDEO} button[${DomAttribute.ARIA_PRESSED}]`;

  function applyState() {
    const isUserInteracted = window.ytrUserInteracted;
    if (isUserInteracted) {
      sharedState.isUserInteracted = true;
    }

    const isRated = Boolean(getRatedButton());
    sharedState.isCurrentlyRated = isRated;

    if (!sharedState.isUserInteracted) {
      sharedState.isRatedInitially = isRated;
    }

    sharedState.isRatingResolved = true;
  }

  ratingWatchObserver = new MutationObserver(mutations => {
    const isRelevant = mutations.some(
      mutation =>
        mutation.type === "childList" ||
        (mutation.type === "attributes" &&
          mutation.attributeName === DomAttribute.ARIA_PRESSED &&
          mutation.target instanceof Element &&
          Boolean(mutation.target.closest(SELECTORS.TOGGLE_BUTTONS_MUSIC_VIDEO)))
    );
    const isButtonPresent = Boolean(document.querySelector(anyButtonSelector));
    if (!isRelevant || !isButtonPresent) {
      return;
    }

    applyState();
  });

  ratingWatchObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [DomAttribute.ARIA_PRESSED]
  });

  // The player bar rate buttons persist across tracks and keep the previous
  // track's rating until the new track's metadata loads, so wait for that to
  // settle before resolving instead of reading the stale buttons right away
  trackSettleController = new AbortController();
  document.addEventListener(
    "loadedmetadata",
    event => {
      if (event.target instanceof HTMLVideoElement) {
        applyState();
      }
    },
    {
      capture: true,
      signal: trackSettleController.signal
    }
  );

  const isButtonPresentInitially = Boolean(document.querySelector(anyButtonSelector));
  if (isInitialRatingCheckPending && isButtonPresentInitially) {
    applyState();
  }

  isInitialRatingCheckPending = false;
}

export default defineContentScript({
  matches: ["https://music.youtube.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    onSubscriptionDecision(decision => {
      sharedState.subscriptionDecision = decision;
    });
    sharedState.subscriptionDecision = getSubscriptionDecision();

    await Promise.all([
      getStorage({
        storageKey: StorageKey.IS_AUTO_LIKE,
        fallback: initial.isAutoLike,
        updateWindowKey: "ytrAutoLikeEnabled"
      }),
      getStorage({
        storageKey: StorageKey.AUTO_LIKE_THRESHOLD,
        fallback: initial.autoLikeThreshold,
        updateWindowKey: "ytrAutoLikeThreshold"
      })
    ]);
    sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    sharedState.isSurfaceEnabled = await getIsCurrentSurfaceEnabled();
    watchIsCurrentSurfaceEnabled(isEnabled => {
      sharedState.isSurfaceEnabled = isEnabled;
    });

    let isMounting = false;
    let activeShadowUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    const elementNameToInject = "ytr-percentage-music";

    watchForInitialRating();

    async function mountUi() {
      const isAlreadyMounted = Boolean(document.querySelector(elementNameToInject));
      const isMountSkipped = isMounting || isAlreadyMounted;
      if (isMountSkipped) {
        return;
      }

      const elContainer = document.querySelector<HTMLElement>(SELECTORS.TOGGLE_BUTTONS_MUSIC_VIDEO);
      if (!elContainer) {
        return;
      }

      const isTimeInfoBeforeButtons = Boolean(
        elContainer.parentElement?.previousElementSibling?.matches(SELECTORS.TIME_INFO_MUSIC)
      );
      const append = isTimeInfoBeforeButtons ? "before" : "after";
      isMounting = true;
      activeShadowUi = await createShadowRootUi(ctx, {
        name: elementNameToInject,
        position: "inline",
        append,
        anchor: elContainer,
        onMount(elContainer) {
          return mount(CsuiAutoLikePercent, { target: elContainer });
        },
        onRemove(app) {
          if (app) {
            void unmount(app);
          }
        }
      });
      activeShadowUi.mount();
      activeShadowUi.shadowHost.dataset.append = append;
      isMounting = false;
    }

    function unmountUi() {
      activeShadowUi?.remove();
      activeShadowUi = null;
    }

    function resetForNewTrack() {
      sharedState.hasMountedForCurrentNav = false;
      sharedState.subscriptionDecision = undefined;
      unmountUi();
      watchForInitialRating();
    }

    let lastTrackVideoId = getTrackVideoId();
    function handleIfTrackChanged() {
      const isAdPlaying = getIsAdPlaying();
      if (isAdPlaying) {
        return;
      }

      const trackVideoId = getTrackVideoId();
      const isSameTrack = !trackVideoId || trackVideoId === lastTrackVideoId;
      if (isSameTrack) {
        return;
      }

      lastTrackVideoId = trackVideoId;
      resetForNewTrack();
    }

    // The player's data-change event is the only prompt signal; the observer below re-checks
    // so a track that started behind an ad still resets once the ad is over
    ytrMessenger.onMessage(YtrMessage.TRACK_VIDEO_ID_CHANGED, ({ data }) => {
      playerVideoId = data;
      handleIfTrackChanged();
    });

    function syncUi() {
      if (getIsUnmountRequired()) {
        unmountUi();
        return;
      }

      if (sharedState.hasMountedForCurrentNav || getIsFreshMountAllowed()) {
        sharedState.hasMountedForCurrentNav = true;
        void mountUi();
      }
    }

    watchMountState(syncUi);

    new MutationObserver(() => {
      handleIfTrackChanged();
      syncUi();
    }).observe(document, OBSERVER_OPTIONS);

    storage.watch<typeof initial.isAutoLike>(StorageKey.IS_AUTO_LIKE, isAutoLikeUpdated => {
      window.ytrAutoLikeEnabled = isAutoLikeUpdated ?? initial.isAutoLike;
      sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    });

    document.addEventListener(
      "timeupdate",
      async event => {
        handleIfTrackChanged();

        const isUserInteractedGlobal = window.ytrUserInteracted;
        if (isUserInteractedGlobal) {
          sharedState.isUserInteracted = true;
          return;
        }

        const { isRatedInitially, isUserInteracted } = sharedState;
        const isRatingFinalized = isRatedInitially || isUserInteracted;
        if (isRatingFinalized) {
          return;
        }

        const { target: elTarget } = event;
        const isTargetVideo = elTarget instanceof HTMLVideoElement;
        if (!isTargetVideo) {
          return;
        }

        const { currentTime } = elTarget;
        const duration = getTrackDuration();
        if (getIsAdPlaying()) {
          sharedState.lastTimeUpdate = currentTime;
          return;
        }

        const isLastTimeUpdateSet = Boolean(sharedState.lastTimeUpdate);
        if (!isLastTimeUpdateSet) {
          sharedState.lastTimeUpdate = currentTime;
        }

        const watchedSeconds = getWatchedSeconds(sharedState.lastTimeUpdate, currentTime, elTarget.playbackRate);
        if (watchedSeconds > 0 && Boolean(duration)) {
          sharedState.percentageWatched += (watchedSeconds / duration) * 100;
          const isAutoLikeTriggered =
            window.ytrAutoLikeEnabled &&
            sharedState.isSurfaceEnabled &&
            sharedState.percentageWatched >= window.ytrAutoLikeThreshold &&
            !sharedState.isUserInteracted &&
            !sharedState.isRatedInitially &&
            !sharedState.isCurrentlyRated;
          if (isAutoLikeTriggered) {
            await rateVideo(true);
          }
        }

        sharedState.lastTimeUpdate = currentTime;
      },
      { capture: true }
    );

    function markUserInteractedIfRateButton(event: Event) {
      const { target: elTarget } = event;
      const isTargetElement = elTarget instanceof HTMLElement;
      if (!isTargetElement) {
        return;
      }

      const isInsideRateButtons = Boolean(elTarget.closest(SELECTORS.TOGGLE_BUTTONS_MUSIC_VIDEO));
      if (!isInsideRateButtons) {
        return;
      }

      sharedState.isUserInteracted = true;
      window.ytrUserInteracted = true;
    }

    document.addEventListener("pointerdown", markUserInteractedIfRateButton, { capture: true });
    document.addEventListener("keydown", markUserInteractedIfRateButton, { capture: true });
    document.addEventListener("click", markUserInteractedIfRateButton);
  }
});
