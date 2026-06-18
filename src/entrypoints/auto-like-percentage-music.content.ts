import { storage } from "#imports";
import { mount, unmount } from "svelte";
import {
  DOM_ATTRIBUTE,
  getStorage,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey,
  YOUTUBE_EVENT
} from "@/lib/utils-initials";
import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";
import { getSubscriptionDecision, onSubscriptionDecision } from "@/lib/ytr-subscription-signal";
import CsuiAutoLikePercent from "./auto-like-percentage.content/CsuiAutoLikePercent.svelte";
import {
  getIsFreshMountAllowed,
  getIsUnmountRequired,
  sharedState,
  watchMountState
} from "./auto-like-percentage.content/states.svelte";

let ratingWatchObserver: MutationObserver | null = null;

function watchForInitialRating() {
  ratingWatchObserver?.disconnect();
  ratingWatchObserver = null;

  sharedState.percentageWatched = 0;
  sharedState.lastTimeUpdate = 0;
  sharedState.isUserInteracted = false;
  sharedState.isRatingResolved = false;
  sharedState.isRatedInitially = false;
  sharedState.isCurrentlyRated = false;
  window.ytrUserInteracted = false;

  const anyButtonSelector = `${SELECTORS.toggleButtonsMusicVideo} button[${DOM_ATTRIBUTE.ariaPressed}]`;

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
          mutation.attributeName === DOM_ATTRIBUTE.ariaPressed &&
          mutation.target instanceof Element &&
          Boolean(mutation.target.closest(SELECTORS.toggleButtonsMusicVideo)))
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
    attributeFilter: [DOM_ATTRIBUTE.ariaPressed]
  });

  const isButtonPresentInitially = Boolean(document.querySelector(anyButtonSelector));
  if (isButtonPresentInitially) {
    applyState();
  }
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
        storageKey: StorageKey.isAutoLike,
        fallback: initial.isAutoLike,
        updateWindowKey: "ytrAutoLikeEnabled"
      }),
      getStorage({
        storageKey: StorageKey.autoLikeThreshold,
        fallback: initial.autoLikeThreshold,
        updateWindowKey: "ytrAutoLikeThreshold"
      })
    ]);
    sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    sharedState.lastHref = location.href;

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
      const elContainer = document.querySelector<HTMLElement>(SELECTORS.toggleButtonsMusicVideo);
      const isContainerPresent = Boolean(elContainer);
      if (!isContainerPresent) {
        return;
      }
      isMounting = true;
      activeShadowUi = await createShadowRootUi(ctx, {
        name: elementNameToInject,
        position: "inline",
        append: "after",
        anchor: SELECTORS.toggleButtonsMusicVideo,
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
      isMounting = false;
    }

    function unmountUi() {
      activeShadowUi?.remove();
      activeShadowUi = null;
    }

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

    new MutationObserver(syncUi).observe(document, OBSERVER_OPTIONS);

    storage.watch<typeof initial.isAutoLike>(StorageKey.isAutoLike, isAutoLikeUpdated => {
      window.ytrAutoLikeEnabled = isAutoLikeUpdated ?? initial.isAutoLike;
      sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    });

    function resetForNewTrack() {
      sharedState.hasMountedForCurrentNav = false;
      sharedState.subscriptionDecision = undefined;
      unmountUi();
      watchForInitialRating();
    }

    function handleIfNavigated() {
      if (location.href === sharedState.lastHref) {
        return;
      }
      sharedState.lastHref = location.href;
      resetForNewTrack();
    }

    let lastTrackSource = "";
    function handleIfTrackChanged() {
      const elVideo = document.querySelector("video");
      const trackSource = elVideo?.currentSrc;
      if (!trackSource || trackSource === lastTrackSource) {
        return;
      }
      lastTrackSource = trackSource;
      resetForNewTrack();
    }

    document.addEventListener(YOUTUBE_EVENT.navigateFinish, handleIfNavigated);
    document.addEventListener("loadstart", handleIfTrackChanged, { capture: true });

    document.addEventListener("timeupdate", async e => {
      handleIfNavigated();
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

      const { target: elTarget } = e;
      const isTargetVideo = elTarget instanceof HTMLVideoElement;
      if (!isTargetVideo) {
        return;
      }

      const { duration, currentTime } = elTarget;
      const isLastTimeUpdateSet = Boolean(sharedState.lastTimeUpdate);
      if (!isLastTimeUpdateSet) {
        sharedState.lastTimeUpdate = currentTime;
      }

      const delta = currentTime - sharedState.lastTimeUpdate;
      const isValidDelta = delta > 0 && delta < 1 && Boolean(duration) && duration !== Infinity;
      if (isValidDelta) {
        sharedState.percentageWatched += (delta / duration) * 100;
        const isAutoLikeTriggered =
          window.ytrAutoLikeEnabled &&
          sharedState.percentageWatched >= window.ytrAutoLikeThreshold &&
          !sharedState.isUserInteracted &&
          !sharedState.isRatedInitially &&
          !sharedState.isCurrentlyRated;
        if (isAutoLikeTriggered) {
          await rateVideo(true);
        }
      }
      sharedState.lastTimeUpdate = currentTime;
    }, { capture: true });

    function markUserInteractedIfRateButton(e: Event) {
      const { target: elTarget } = e;
      const isTargetElement = elTarget instanceof HTMLElement;
      if (!isTargetElement) {
        return;
      }
      const isInsideRateButtons = Boolean(elTarget.closest(SELECTORS.toggleButtonsMusicVideo));
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
