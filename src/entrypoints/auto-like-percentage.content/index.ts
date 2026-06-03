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
import { sharedState, watchMountState } from "./states.svelte";

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
    const isUserInteractedGlobal = window.ytrUserInteracted;
    if (isUserInteractedGlobal) {
      sharedState.isUserInteracted = true;
    }
    const isRated = Boolean(getRatedButton());
    sharedState.isCurrentlyRated = isRated;
    if (!sharedState.isUserInteracted) {
      sharedState.isRatedInitially = isRated;
    }
    sharedState.isRatingResolved = true;
  }

  // Keep watching after initial resolution to catch YouTube's async aria-pressed updates
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
    let isMounting = false;
    let lastHref = location.href;
    const elementNameToInject = "ytr-percentage";

    watchForInitialRating();
    sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
    sharedState.isAdPlaying = getIsAdPlaying();
    sharedState.isAdInitiallyPlaying = sharedState.isAdPlaying;
    sharedState.isShorts = getIsShorts();

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

    let activeShadowUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let activeFullscreenShadowUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let isMountingFullscreen = false;
    let lastNavigationHref = location.href;
    let hasMountedForCurrentNav = false;
    const elementNameToInjectFullscreen = "ytr-percentage-fullscreen";

    function handleIfNavigated() {
      const isSameUrl = location.href === lastNavigationHref;
      if (isSameUrl) {
        return;
      }
      lastNavigationHref = location.href;
      lastHref = "";
      sharedState.isShorts = getIsShorts();
      sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
      sharedState.subscriptionDecision = undefined;
      hasMountedForCurrentNav = false;
      unmountUi();
      watchForInitialRating();
    }

    async function mountUi() {
      await Promise.all([mountNormalUi(), mountFullscreenUi()]);
    }

    async function mountNormalUi() {
      const isAlreadyMounted = Boolean(document.querySelector(elementNameToInject));
      const isMountSkipped = isMounting || isAlreadyMounted;
      if (isMountSkipped) {
        return;
      }
      const elContainer = document.querySelector(SELECTORS.percentageContainer);
      if (!elContainer) {
        return;
      }
      isMounting = true;
      activeShadowUi = await createShadowRootUi(ctx, {
        name: elementNameToInject,
        position: "inline",
        append: "first",
        anchor: SELECTORS.percentageContainer,
        onMount(elShadowContainer) {
          return mount(CsuiAutoLikePercent, { target: elShadowContainer });
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

    async function mountFullscreenUi() {
      const isAlreadyMounted = Boolean(document.querySelector(elementNameToInjectFullscreen));
      const isMountSkipped = isMountingFullscreen || isAlreadyMounted;
      if (isMountSkipped) {
        return;
      }
      const elFullscreenAnchor = document.querySelector(SELECTORS.percentageContainerFullscreen);
      if (!elFullscreenAnchor) {
        return;
      }
      isMountingFullscreen = true;
      activeFullscreenShadowUi = await createShadowRootUi(ctx, {
        name: elementNameToInjectFullscreen,
        position: "inline",
        append: "before",
        anchor: SELECTORS.percentageContainerFullscreen,
        onMount(elShadowContainer) {
          return mount(CsuiAutoLikePercent, { target: elShadowContainer });
        },
        onRemove(app) {
          if (app) {
            void unmount(app);
          }
        }
      });
      activeFullscreenShadowUi.mount();
      isMountingFullscreen = false;
    }

    function unmountUi() {
      activeShadowUi?.remove();
      activeShadowUi = null;
      activeFullscreenShadowUi?.remove();
      activeFullscreenShadowUi = null;
    }

    let isFreshMountAllowed = false;
    let isUnmountRequired = true;

    function syncUi() {
      if (isUnmountRequired) {
        unmountUi();
        return;
      }
      if (hasMountedForCurrentNav || isFreshMountAllowed) {
        hasMountedForCurrentNav = true;
        void mountUi();
      }
    }

    watchMountState(({ isFreshMountAllowed: nextFreshMountAllowed, isUnmountRequired: nextUnmountRequired }) => {
      isFreshMountAllowed = nextFreshMountAllowed;
      isUnmountRequired = nextUnmountRequired;
      syncUi();
    });

    new MutationObserver(() => {
      handleIfNavigated();
      syncUi();
    }).observe(document, OBSERVER_OPTIONS);

    storage.watch<typeof initial.isAutoLike>(StorageKey.isAutoLike, isAutoLikeUpdated => {
      window.ytrAutoLikeEnabled = isAutoLikeUpdated ?? initial.isAutoLike;
      sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    });

    document.addEventListener("timeupdate", async e => {
      const isNewPage = location.href !== lastHref;
      if (isNewPage) {
        lastHref = location.href;
        watchForInitialRating();
      }

      const isUserInteractedGlobal = window.ytrUserInteracted;
      if (isUserInteractedGlobal) {
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

      const { target } = e;
      const isTargetVideo = target instanceof HTMLVideoElement;
      if (!isTargetVideo) {
        return;
      }
      const { duration, currentTime } = target;
      if (isAdPlaying) {
        sharedState.lastTimeUpdate = currentTime;
        return;
      }

      const isLiveOrPremiere = sharedState.isLiveOrPremiere;
      if (isLiveOrPremiere) {
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
      const { target } = e;
      const isTargetElement = target instanceof HTMLElement;
      if (!isTargetElement) {
        return;
      }
      const isInsideRateButtons = Boolean(target.closest(`${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`));
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
