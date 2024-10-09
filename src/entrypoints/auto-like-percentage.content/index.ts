import CsuiAutoLikePercent from "./CsuiAutoLikePercent.svelte";
import { getElementByMutationObserver, SELECTORS } from "@/lib/utils-initials";

export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const elementNameToInject = "ytr-percentage";
    const elWatchPercentage = document.querySelector(elementNameToInject);
    const elContainer = await getElementByMutationObserver(SELECTORS.percentageContainer);
    if (elWatchPercentage || !elContainer) {
      return;
    }

    const ui = await createShadowRootUi(ctx, {
      name: elementNameToInject,
      position: "inline",
      append: "first",
      anchor: SELECTORS.percentageContainer,
      onMount: container => new CsuiAutoLikePercent({ target: container }),
      onRemove: container => container?.$destroy()
    });

    ui.mount();
  }
});
