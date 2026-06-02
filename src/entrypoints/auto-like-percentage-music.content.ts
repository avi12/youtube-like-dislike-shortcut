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
import CsuiAutoLikePercent from "./auto-like-percentage.content/CsuiAutoLikePercent.svelte";
import { sharedState, watchDisplayPercentage } from "./auto-like-percentage.content/states.svelte";

let ratingWatchObserver: MutationObserver | null = null;

function watchForInitialRating() {
  ratingWatchObserver?.disconnect();
  ratingWatchObserver = null;

  sharedState.percentageWatched = 0;
  sharedState.lastTimeUpdate = 0;
  sharedState.isUserInteracted = false;
  sharedState.isRatingResolved = false;
  sharedState.isRatedInitially = false;
  window.ytrUserInteracted = false;

  const anyButtonSelector = `${SELECTORS.toggleButtonsMusicVideo} button[${DOM_ATTRIBUTE.ariaPressed}]`;

  function applyState() {
    const isUserInteracted = window.ytrUserInteracted;
    if (isUserInteracted) {
      sharedState.isUserInteracted = true;
    }
    const isRated = Boolean(getRatedButton());
    const isSharedUserInteracted = sharedState.isUserInteracted;
    if (!isSharedUserInteracted) {
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

    let lastHref = location.href;
    let lastNavigationHref = location.href;
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
        onMount(container) {
          return mount(CsuiAutoLikePercent, { target: container });
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

    let isDisplayPercentage = false;
    function syncUi() {
      if (isDisplayPercentage) {
        void mountUi();
      } else {
        unmountUi();
      }
    }

    watchDisplayPercentage(isDisplay => {
      isDisplayPercentage = isDisplay;
      syncUi();
    });

    new MutationObserver(syncUi).observe(document, OBSERVER_OPTIONS);

    storage.watch<typeof initial.isAutoLike>(StorageKey.isAutoLike, isAutoLikeUpdated => {
      window.ytrAutoLikeEnabled = isAutoLikeUpdated ?? initial.isAutoLike;
      sharedState.isAutoLikeEnabled = window.ytrAutoLikeEnabled;
    });

    document.addEventListener(YOUTUBE_EVENT.navigateFinish, () => {
      const isNewNavigation = location.href !== lastNavigationHref;
      if (isNewNavigation) {
        lastNavigationHref = location.href;
        sharedState.hasNavigated = true;
      }
      lastHref = "";
      watchForInitialRating();
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

      const { isRatedInitially, isUserInteracted } = sharedState;
      const isRatingFinalized = isRatedInitially || isUserInteracted;
      if (isRatingFinalized) {
        return;
      }

      const { target } = e;
      const isTargetVideo = target instanceof HTMLVideoElement;
      if (!isTargetVideo) {
        return;
      }

      const { duration, currentTime } = target;
      const isLastTimeUpdateSet = Boolean(sharedState.lastTimeUpdate);
      if (!isLastTimeUpdateSet) {
        sharedState.lastTimeUpdate = currentTime;
      }

      const delta = currentTime - sharedState.lastTimeUpdate;
      const isValidDelta = delta > 0 && delta < 1 && Boolean(duration) && duration !== Infinity;
      if (isValidDelta) {
        sharedState.percentageWatched += (delta / duration) * 100;
        const shouldAutoLike =
          window.ytrAutoLikeEnabled &&
          sharedState.hasNavigated &&
          sharedState.percentageWatched >= window.ytrAutoLikeThreshold &&
          !sharedState.isUserInteracted &&
          !sharedState.isRatedInitially;
        if (shouldAutoLike) {
          await rateVideo(true);
        }
      }
      sharedState.lastTimeUpdate = currentTime;
    }, { capture: true });

    function markUserInteractedIfRateButton(e: Event) {
      const { target } = e;
      const isTargetElement = target instanceof HTMLElement;
      if (!isTargetElement) {
        return;
      }
      const isInsideRateButtons = Boolean(target.closest(SELECTORS.toggleButtonsMusicVideo));
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
