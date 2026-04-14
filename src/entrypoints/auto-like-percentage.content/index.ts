import { mount, unmount } from "svelte";
import {
  getStorage,
  getVisibleElement,
  OBSERVER_OPTIONS,
  SELECTORS,
  StorageKey
} from "@/lib/utils-initials";
import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";
import CsuiAutoLikePercent from "./CsuiAutoLikePercent.svelte";
import { sharedState } from "./states.svelte";

function getIsAdPlaying() {
  return Boolean(document.querySelector(SELECTORS.adOverlay));
}

function getIsLiveOrPremiere() {
  return Boolean(getVisibleElement(SELECTORS.liveBadge));
}

let ratingWatchObserver: MutationObserver | null = null;
let navigateFinishController: AbortController | null = null;

function watchForInitialRating() {
  ratingWatchObserver?.disconnect();
  ratingWatchObserver = null;
  navigateFinishController?.abort();
  navigateFinishController = null;

  const ratedSelector = `:where(${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}) button[aria-pressed=true]`;
  const anyButtonSelector = `:where(${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}) button[aria-pressed]`;

  function applyState() {
    const isRated = Boolean(getRatedButton());
    sharedState.isRatedInitially = isRated;
    sharedState.isUserInteracted = isRated;
    sharedState.isRatingResolved = true;
    window.ytrUserInteracted = isRated;
  }

  function stopWatching() {
    ratingWatchObserver?.disconnect();
    ratingWatchObserver = null;
    navigateFinishController?.abort();
    navigateFinishController = null;
  }

  navigateFinishController = new AbortController();
  document.addEventListener(
    "yt-navigate-finish",
    () => {
      stopWatching();
      applyState();
    },
    { once: true, signal: navigateFinishController.signal }
  );

  const containerSelector = `${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`;

  ratingWatchObserver = new MutationObserver(mutations => {
    const hasRatedButtonChange = mutations.some(
      mutation =>
        mutation.type === "attributes" &&
        mutation.attributeName === "aria-pressed" &&
        mutation.target instanceof Element &&
        Boolean(mutation.target.closest(containerSelector))
    );

    if (!hasRatedButtonChange || !document.querySelector(anyButtonSelector)) {
      return;
    }
    if (!document.querySelector(ratedSelector)) {
      return;
    }
    stopWatching();
    applyState();
  });

  ratingWatchObserver.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-pressed"]
  });
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

    const [isAutoLike, autoLikeThreshold] = await Promise.all([
      getStorage({
        storageKey: StorageKey.isAutoLike,
        fallback: false,
        updateWindowKey: "ytrAutoLikeEnabled"
      }),
      getStorage({
        storageKey: StorageKey.autoLikeThreshold,
        fallback: 70,
        updateWindowKey: "ytrAutoLikeThreshold"
      })
    ]);

    async function mountUiIfNeeded() {
      if (isMounting || document.querySelector(elementNameToInject)) {
        return;
      }
      const elContainer = document.querySelector(SELECTORS.percentageContainer);
      if (!elContainer) {
        return;
      }

      isMounting = true;
      const shadowUi = await createShadowRootUi(ctx, {
        name: elementNameToInject,
        position: "inline",
        append: "first",
        anchor: SELECTORS.percentageContainer,
        onMount(container) {
          return mount(CsuiAutoLikePercent, {
            target: container,
            props: {
              isAutoLikeEnabled: window.ytrAutoLikeEnabled ?? isAutoLike
            }
          });
        },
        onRemove(app) {
          if (app) {
            void unmount(app);
          }
        }
      });
      shadowUi.mount();
      isMounting = false;
    }

    await mountUiIfNeeded();
    new MutationObserver(() => {
      void mountUiIfNeeded();
    }).observe(document, OBSERVER_OPTIONS);

    document.addEventListener("timeupdate", async e => {
      const isNewPage = location.href !== lastHref;
      if (isNewPage) {
        lastHref = location.href;
        sharedState.percentageWatched = 0;
        sharedState.lastTimeUpdate = 0;
        sharedState.isRatingResolved = false;
        sharedState.isRatedInitially = false;
        sharedState.isUserInteracted = false;
        window.ytrUserInteracted = false;
        watchForInitialRating();
      }

      if (window.ytrUserInteracted) {
        sharedState.isUserInteracted = true;
        return;
      }

      sharedState.isAdPlaying = getIsAdPlaying();
      sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
      const { isRatedInitially, isUserInteracted, isAdPlaying, isAdInitiallyPlaying } = sharedState;
      if (isRatedInitially || isUserInteracted) {
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
      if (!(target instanceof HTMLVideoElement)) {
        return;
      }
      const { duration, currentTime } = target;
      if (isAdPlaying) {
        sharedState.lastTimeUpdate = currentTime;
        return;
      }

      if (sharedState.isLiveOrPremiere) {
        sharedState.lastTimeUpdate = currentTime;
        return;
      }

      if (!sharedState.lastTimeUpdate) {
        sharedState.lastTimeUpdate = currentTime;
      }
      const previousTimeUpdate = sharedState.lastTimeUpdate;
      const delta = currentTime - previousTimeUpdate;
      if (delta > 0 && delta < 1 && duration && duration !== Infinity) {
        sharedState.percentageWatched += (delta / duration) * 100;
        const shouldAutoLike =
          (window.ytrAutoLikeEnabled ?? isAutoLike) &&
          sharedState.percentageWatched >= (window.ytrAutoLikeThreshold ?? autoLikeThreshold) &&
          !sharedState.isLiveOrPremiere &&
          !sharedState.isUserInteracted &&
          !sharedState.isRatedInitially;
        if (shouldAutoLike) {
          await rateVideo(true);
        }
      }
      sharedState.lastTimeUpdate = currentTime;
    },
    { capture: true }
    );

    document.addEventListener("click", e => {
      const { target } = e;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const elRatePressed = target
        .closest(`${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`)
        ?.querySelector("button[aria-pressed=true]");
      if (elRatePressed) {
        sharedState.isUserInteracted = true;
      }
    });
  }
});
