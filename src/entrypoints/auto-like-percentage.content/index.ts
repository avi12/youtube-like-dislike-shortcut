import { storage } from "#imports";
import { mount, unmount } from "svelte";
import {
  DOM_ATTRIBUTE,
  getStorage,
  getVisibleElement,
  initial,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey,
  YOUTUBE_EVENT,
  YOUTUBE_PATHNAME
} from "@/lib/utils-initials";
import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";
import { getSubscriptionDecision, onSubscriptionDecision } from "@/lib/ytr-subscription-signal";
import CsuiAutoLikePercent from "./CsuiAutoLikePercent.svelte";
import { getIsFreshMountAllowed, getIsUnmountRequired, sharedState, watchMountState } from "./states.svelte";

enum CsuiElementName {
  percentage = "ytr-percentage",
  percentageFullscreen = "ytr-percentage-fullscreen"
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
    name: CsuiElementName.percentage,
    selector: SELECTORS.percentageContainer,
    append: "first",
    shadowUi: null,
    isMounting: false
  },
  {
    name: CsuiElementName.percentageFullscreen,
    selector: SELECTORS.percentageContainerFullscreen,
    append: "before",
    shadowUi: null,
    isMounting: false
  }
];

function getIsShorts() {
  return location.pathname.startsWith(YOUTUBE_PATHNAME.shorts);
}

function getIsAdPlaying() {
  return Boolean(document.querySelector(SELECTORS.adOverlay));
}

function getIsLiveOrPremiere() {
  return Boolean(getVisibleElement(SELECTORS.liveBadge));
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

  const containerSelector = `${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`;
  const anyButtonSelector = `:where(${containerSelector}) button[${DOM_ATTRIBUTE.ariaPressed}]`;

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
  }

  ratingWatchObserver = new MutationObserver(mutations => {
    const isRelevant = mutations.some(
      mutation =>
        mutation.type === "childList" ||
        (mutation.type === "attributes" &&
          mutation.attributeName === DOM_ATTRIBUTE.ariaPressed &&
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
    attributeFilter: [DOM_ATTRIBUTE.ariaPressed]
  });

  navigateFinishController = new AbortController();
  document.addEventListener(YOUTUBE_EVENT.navigateFinish, applyState, {
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
    sharedState.isShorts = getIsShorts();
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

    function handleIfNavigated() {
      if (location.href === sharedState.lastHref) {
        return;
      }
      sharedState.lastHref = location.href;
      sharedState.hasMountedForCurrentNav = false;
      sharedState.isShorts = getIsShorts();
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

    storage.watch<typeof initial.isAutoLike>(StorageKey.isAutoLike, isAutoLikeUpdated => {
      window.ytrAutoLikeEnabled = isAutoLikeUpdated ?? initial.isAutoLike;
      sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    });

    document.addEventListener("timeupdate", async e => {
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

      const { target: elTarget } = e;
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
      const delta = currentTime - previousTimeUpdate;
      const isDeltaInRange = delta > 0 && delta < 1;
      const isDurationUsable = Boolean(duration) && duration !== Infinity;
      if (isDeltaInRange && isDurationUsable) {
        sharedState.percentageWatched += (delta / duration) * 100;
        const isAutoLikeTriggered =
          window.ytrAutoLikeEnabled &&
          sharedState.percentageWatched >= window.ytrAutoLikeThreshold &&
          !sharedState.isLiveOrPremiere &&
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

    function markUserInteractedIfRateButton(e: Event) {
      const { target: elTarget } = e;
      const isTargetElement = elTarget instanceof HTMLElement;
      if (!isTargetElement) {
        return;
      }
      const isInsideRateButtons = Boolean(elTarget.closest(`${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`));
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
