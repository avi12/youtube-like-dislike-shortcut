import { mount, unmount } from "svelte";

import { storage } from "#imports";
import { getIsCurrentSurfaceEnabled, watchIsCurrentSurfaceEnabled } from "@/lib/surfaces";
import {
  DomAttribute,
  getCurrentSurface,
  getStorage,
  getVisibleElement,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey,
  Surface,
  YoutubeEvent
} from "@/lib/utils-initials";
import {
  clearWatchedPercentage,
  getWatchedSeconds,
  loadWatchedPercentage,
  saveWatchedPercentage
} from "@/lib/watch-progress";
import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";
import { getSubscriptionDecision, onSubscriptionDecision } from "@/lib/ytr-subscription-signal";

import CsuiAutoLikePercent from "./CsuiAutoLikePercent.svelte";
import { getIsFreshMountAllowed, getIsUnmountRequired, sharedState, watchMountState } from "./states.svelte";

const PERCENT = 100;

enum CsuiElementName {
  PERCENTAGE = "ytr-percentage",
  PERCENTAGE_FULLSCREEN = "ytr-percentage-fullscreen"
}

interface UiManager {
  name: CsuiElementName;
  selector: string;
  append: "first" | "before" | "after";
  shadowUi: Awaited<ReturnType<typeof createShadowRootUi>> | null;
  isMounting: boolean;
}

const uiManagers: UiManager[] = [
  {
    name: CsuiElementName.PERCENTAGE,
    selector: SELECTORS.PERCENTAGE_CONTAINER,
    append: "first",
    shadowUi: null,
    isMounting: false
  },
  {
    name: CsuiElementName.PERCENTAGE_FULLSCREEN,
    selector: SELECTORS.PERCENTAGE_CONTAINER_FULLSCREEN,
    append: "before",
    shadowUi: null,
    isMounting: false
  }
];

function getIsAdPlaying() {
  return Boolean(document.querySelector(SELECTORS.AD_OVERLAY));
}

function getIsLiveOrPremiere() {
  return Boolean(getVisibleElement(SELECTORS.LIVE_BADGE));
}

let ratingWatchObserver: MutationObserver | null = null;
let navigateFinishController: AbortController | null = null;
let isInitialRatingCheckPending = true;

function watchForInitialRating() {
  ratingWatchObserver?.disconnect();
  ratingWatchObserver = null;
  navigateFinishController?.abort();
  navigateFinishController = null;

  sharedState.isRatingResolved = false;
  sharedState.isRatedInitially = false;
  sharedState.isCurrentlyRated = false;
  sharedState.isUserInteracted = false;
  sharedState.percentageWatched = 0;
  sharedState.lastTimeUpdate = 0;
  window.ytrUserInteracted = false;

  const hrefWhenStarted = location.href;
  void loadWatchedPercentage().then(savedPercentage => {
    const isSameVideo = location.href === hrefWhenStarted;
    if (isSameVideo) {
      sharedState.percentageWatched += savedPercentage;
    }
  });

  const containerSelector = `${SELECTORS.TOGGLE_BUTTONS_NORMAL_VIDEO}, ${SELECTORS.TOGGLE_BUTTONS_SHORTS_VIDEO}`;
  const anyButtonSelector = `:where(${containerSelector}) button[${DomAttribute.ARIA_PRESSED}]`;

  function applyState() {
    if (window.ytrUserInteracted) {
      sharedState.isUserInteracted = true;
    }

    const isRated = Boolean(getRatedButton());
    sharedState.isCurrentlyRated = isRated;

    if (!sharedState.isUserInteracted) {
      sharedState.isRatedInitially = isRated;
    }

    sharedState.isRatingResolved = true;

    if (isRated || sharedState.isUserInteracted) {
      void clearWatchedPercentage();
    }
  }

  ratingWatchObserver = new MutationObserver(mutations => {
    const isRelevant = mutations.some(
      mutation =>
        mutation.type === "childList" ||
        (mutation.type === "attributes" &&
          mutation.attributeName === DomAttribute.ARIA_PRESSED &&
          mutation.target instanceof Element &&
          Boolean(mutation.target.closest(containerSelector)))
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

  navigateFinishController = new AbortController();
  document.addEventListener(YoutubeEvent.NAVIGATE_FINISH, applyState, {
    once: true,
    signal: navigateFinishController.signal
  });

  const isButtonPresentInitially = Boolean(document.querySelector(anyButtonSelector));
  if (isInitialRatingCheckPending && isButtonPresentInitially) {
    applyState();
  }

  isInitialRatingCheckPending = false;
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    sharedState.isShorts = getCurrentSurface() === Surface.SHORTS;
    sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
    sharedState.isAdPlaying = getIsAdPlaying();
    sharedState.isAdInitiallyPlaying = sharedState.isAdPlaying;
    sharedState.lastHref = location.href;

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

    watchForInitialRating();

    async function mountManager(manager: UiManager) {
      const isAlreadyMounted = Boolean(document.querySelector(manager.name));
      const isSkipped = manager.isMounting || isAlreadyMounted;
      if (isSkipped) {
        return;
      }

      const elAnchor = document.querySelector(manager.selector);
      if (!elAnchor) {
        return;
      }

      manager.isMounting = true;
      manager.shadowUi = await createShadowRootUi(ctx, {
        name: manager.name,
        position: "inline",
        append: manager.append,
        anchor: manager.selector,
        onMount(elShadowContainer) {
          return mount(CsuiAutoLikePercent, { target: elShadowContainer });
        },
        onRemove(app) {
          if (app) {
            void unmount(app);
          }
        }
      });
      manager.shadowUi.mount();
      manager.isMounting = false;
    }

    async function mountUi() {
      await Promise.all(uiManagers.map(mountManager));
    }

    function unmountUi() {
      for (const manager of uiManagers) {
        manager.shadowUi?.remove();
        manager.shadowUi = null;
      }
    }

    async function refreshIsSurfaceEnabled() {
      sharedState.isSurfaceEnabled = await getIsCurrentSurfaceEnabled();
    }

    function handleIfNavigated() {
      if (location.href === sharedState.lastHref) {
        return;
      }

      sharedState.lastHref = location.href;
      sharedState.hasMountedForCurrentNav = false;
      sharedState.isShorts = getCurrentSurface() === Surface.SHORTS;
      void refreshIsSurfaceEnabled();
      sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
      sharedState.subscriptionDecision = undefined;
      unmountUi();
      watchForInitialRating();
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

    new MutationObserver(() => {
      handleIfNavigated();
      syncUi();
    }).observe(document, OBSERVER_OPTIONS);

    storage.watch<typeof initial.isAutoLike>(StorageKey.IS_AUTO_LIKE, isAutoLikeUpdated => {
      window.ytrAutoLikeEnabled = isAutoLikeUpdated ?? initial.isAutoLike;
      sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    });

    document.addEventListener(
      "timeupdate",
      async event => {
        handleIfNavigated();

        if (window.ytrUserInteracted) {
          sharedState.isUserInteracted = true;
          return;
        }

        sharedState.isAdPlaying = getIsAdPlaying();
        sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
        const { isRatedInitially, isUserInteracted, isAdPlaying, isAdInitiallyPlaying } = sharedState;
        const isRatingFinalized = isRatedInitially || isUserInteracted;
        if (isRatingFinalized) {
          return;
        }

        const isInitialAdFinished = isAdInitiallyPlaying && !isAdPlaying;
        if (isInitialAdFinished) {
          sharedState.percentageWatched = 0;
          sharedState.isAdInitiallyPlaying = false;
        }

        const isImmediatePostNavigationAd = !isAdInitiallyPlaying && isAdPlaying && sharedState.percentageWatched === 0;
        if (isImmediatePostNavigationAd) {
          sharedState.isAdInitiallyPlaying = true;
          sharedState.percentageWatched = 0;
        }

        const { target: elTarget } = event;
        const isTargetVideo = elTarget instanceof HTMLVideoElement;
        if (!isTargetVideo) {
          return;
        }

        const { duration, currentTime } = elTarget;
        if (isAdPlaying) {
          sharedState.lastTimeUpdate = currentTime;
          return;
        }

        if (sharedState.isLiveOrPremiere) {
          sharedState.lastTimeUpdate = currentTime;
          return;
        }

        const isLastTimeUpdateSet = Boolean(sharedState.lastTimeUpdate);
        if (!isLastTimeUpdateSet) {
          sharedState.lastTimeUpdate = currentTime;
        }

        const previousTimeUpdate = sharedState.lastTimeUpdate;
        const watchedSeconds = getWatchedSeconds(previousTimeUpdate, currentTime, elTarget.playbackRate);
        const isDurationUsable = Boolean(duration) && duration !== Infinity;
        if (watchedSeconds > 0 && isDurationUsable) {
          sharedState.percentageWatched += (watchedSeconds / duration) * PERCENT;
          void saveWatchedPercentage(sharedState.percentageWatched);
          const isAutoLikeTriggered =
            window.ytrAutoLikeEnabled &&
            sharedState.isSurfaceEnabled &&
            sharedState.percentageWatched >= window.ytrAutoLikeThreshold &&
            !sharedState.isLiveOrPremiere &&
            !sharedState.isUserInteracted &&
            !sharedState.isRatedInitially &&
            !sharedState.isCurrentlyRated;
          if (isAutoLikeTriggered) {
            await rateVideo(true);
            await clearWatchedPercentage();
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

      const isInsideRateButtons = Boolean(
        elTarget.closest(`${SELECTORS.TOGGLE_BUTTONS_NORMAL_VIDEO}, ${SELECTORS.TOGGLE_BUTTONS_SHORTS_VIDEO}`)
      );
      if (!isInsideRateButtons) {
        return;
      }

      sharedState.isUserInteracted = true;
      window.ytrUserInteracted = true;
      void clearWatchedPercentage();
    }

    document.addEventListener("pointerdown", markUserInteractedIfRateButton, { capture: true });
    document.addEventListener("keydown", markUserInteractedIfRateButton, { capture: true });
    document.addEventListener("click", markUserInteractedIfRateButton);
  }
});
