import { mount, unmount } from "svelte";
import CsuiAutoLikePercent from "./CsuiAutoLikePercent.svelte";
import { sharedState } from "./states.svelte";
import { getStorage, getVisibleElement, OBSERVER_OPTIONS, SELECTORS } from "@/lib/utils-initials";
import { getRatedButton, rateVideo } from "@/lib/ytr-buttons";

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
    let isMounting = false;
    let lastPathname = location.pathname;
    const elementNameToInject = "ytr-percentage";

    sharedState.isUserInteracted = Boolean(getRatedButton());
    sharedState.isRatedInitially = sharedState.isUserInteracted;
    sharedState.isLiveOrPremiere = getIsLiveOrPremiere();
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
              isAutoLikeEnabled: window.ytrAutoLikeEnabled ?? isAutoLike,
              autoLikeThreshold: window.ytrAutoLikeThreshold ?? autoLikeThreshold
            }
          });
        },
        onRemove(app) {
          if (app) {
            unmount(app);
          }
        }
      });
      shadowUi.mount();
      isMounting = false;
    }

    await mountUiIfNeeded();
    new MutationObserver(() => {
      mountUiIfNeeded();
    }).observe(document, OBSERVER_OPTIONS);

    document.addEventListener("timeupdate", e => {
      const isNewPage = location.pathname !== lastPathname;
      if (isNewPage) {
        lastPathname = location.pathname;
        sharedState.percentageWatched = 0;
        sharedState.lastTimeUpdate = 0;
        sharedState.isUserInteracted = false;
        sharedState.isRatedInitially = false;
        window.ytrUserInteracted = false;
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
      const prev = sharedState.lastTimeUpdate;
      const delta = currentTime - prev;
      if (delta > 0 && delta < 1 && duration && duration !== Infinity) {
        sharedState.percentageWatched += (delta / duration) * 100;
        const shouldAutoLike =
          (window.ytrAutoLikeEnabled ?? isAutoLike) &&
          sharedState.percentageWatched >= (window.ytrAutoLikeThreshold ?? autoLikeThreshold) &&
          !sharedState.isLiveOrPremiere &&
          !sharedState.isUserInteracted &&
          !sharedState.isRatedInitially;
        if (shouldAutoLike) {
          rateVideo(true);
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
