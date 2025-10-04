import { mount, unmount } from "svelte";
import CsuiAutoLikePercent from "./CsuiAutoLikePercent.svelte";
import { sharedState } from "./states.svelte";
import {
  getElementByMutationObserver,
  getStorage,
  getVisibleElement,
  REGEX_SUPPORTED_PAGES,
  SELECTORS
} from "@/lib/utils-initials";
import { getRatedButton } from "@/lib/ytr-buttons";

function getIsAdPlaying() {
  return Boolean(document.querySelector(SELECTORS.adOverlay));
}

function getIsLiveOrPremiere() {
  return Boolean(getVisibleElement(SELECTORS.liveBadge));
}

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    let lastTimeUpdate = 0;
    const elementNameToInject = "ytr-percentage";
    const elWatchPercentage = document.querySelector(elementNameToInject);
    const elContainer = await getElementByMutationObserver(SELECTORS.percentageContainer);
    if (elWatchPercentage || !elContainer) {
      return;
    }

    sharedState.isUserInteracted = Boolean(getRatedButton());
    sharedState.isRatedInitially = sharedState.isUserInteracted;
    sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
    // Set isAdInitiallyPlaying true if ad is playing on initial load
    sharedState.isAdPlaying = getIsAdPlaying();
    sharedState.isAdInitiallyPlaying = sharedState.isAdPlaying;

    const [isAutoLike, autoLikeThreshold] = await Promise.all([
      getStorage({
        area: "sync",
        key: "isAutoLike",
        fallback: false,
        updateWindowKey: "ytrAutoLikeEnabled"
      }),
      getStorage({
        area: "sync",
        key: "autoLikeThreshold",
        fallback: 70,
        updateWindowKey: "ytrAutoLikeThreshold"
      })
    ]);

    const ui = await createShadowRootUi(ctx, {
      name: elementNameToInject,
      position: "inline",
      append: "first",
      anchor: SELECTORS.percentageContainer,
      onMount(container) {
        return mount(CsuiAutoLikePercent, {
          target: container,
          props: {
            isAutoLikeEnabled: isAutoLike,
            autoLikeThreshold
          }
        });
      },
      onRemove(app) {
        if (app) {
          unmount(app);
        }
      }
    });

    ui.mount();

    document.addEventListener("timeupdate", event => {
      if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
        return;
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

      // Reset percentage only if ad was playing on initial load and now finished
      if (isAdInitiallyPlaying && !isAdPlaying) {
        sharedState.percentageWatched = 0;
        sharedState.isAdInitiallyPlaying = false;
      }
      // If ad starts immediately after navigation, treat as initial ad
      if (!isAdInitiallyPlaying && isAdPlaying && sharedState.percentageWatched === 0) {
        sharedState.isAdInitiallyPlaying = true;
        sharedState.percentageWatched = 0;
      }

      const video = event.target as HTMLVideoElement;
      const { duration, currentTime } = video;
      // Block increment only if ad is currently playing
      if (isAdPlaying) {
        lastTimeUpdate = currentTime;
        return;
      }

      // Only update percentage if not live/premiere
      if (sharedState.isLiveOrPremiere) {
        lastTimeUpdate = currentTime;
        return;
      }

      if (!lastTimeUpdate) {
        lastTimeUpdate = currentTime;
      }
      const prev = lastTimeUpdate;
      const delta = currentTime - prev;
      if (delta > 0 && delta < 1 && duration && duration !== Infinity) {
        sharedState.percentageWatched += (delta / duration) * 100;
      }
      lastTimeUpdate = currentTime;
    },
    { capture: true }
    );

    document.addEventListener("click", e => {
      if (!location.pathname.match(REGEX_SUPPORTED_PAGES)) {
        return;
      }

      const target = e.target as HTMLElement;

      const elRatePressed = target
        .closest(`${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}`)
        ?.querySelector("button[aria-pressed=true]");
      if (elRatePressed) {
        sharedState.isUserInteracted = true;
      }
    });
  }
});
