import { Rating } from "@/lib/types";
import { DomAttribute, getCurrentSurface, SELECTORS, Surface } from "@/lib/utils-initials";
import { showRateBezel } from "@/lib/ytr-bezel";
import { RateAction, sendRateRequest } from "@/lib/ytr-messaging";

let gLastRating = Rating.LIKE;

function getIsActive(elButton: HTMLElement) {
  return elButton.ariaPressed === "true";
}

function getShortsRateButtons() {
  const elActionBar = document.querySelector<HTMLElement>(SELECTORS.TOGGLE_BUTTONS_SHORTS_VIDEO);
  if (elActionBar === null) {
    return {};
  }

  const elKnownLike = elActionBar.querySelector<HTMLButtonElement>(SELECTORS.LIKE_BUTTON) ?? undefined;
  const elKnownDislike = elActionBar.querySelector<HTMLButtonElement>(SELECTORS.DISLIKE_BUTTON) ?? undefined;
  if (elKnownLike || elKnownDislike) {
    return {
      elLike: elKnownLike,
      elDislike: elKnownDislike
    };
  }

  const elToggleButtons = elActionBar.querySelectorAll<HTMLButtonElement>(`button[${DomAttribute.ARIA_PRESSED}]`);
  const isLikeDislikePair = elToggleButtons.length === 2;
  if (!isLikeDislikePair) {
    return {};
  }

  return {
    elLike: elToggleButtons.item(0),
    elDislike: elToggleButtons.item(1)
  };
}

export function getRateButtons() {
  if (getCurrentSurface() === Surface.SHORTS) {
    return getShortsRateButtons();
  }

  const containerSelector = `${SELECTORS.TOGGLE_BUTTONS_NORMAL_VIDEO}, ${SELECTORS.TOGGLE_BUTTONS_MUSIC_VIDEO}`;
  const elButtonsRate = document.querySelector<HTMLElement>(containerSelector);
  if (elButtonsRate === null) {
    return {};
  }

  return {
    elLike: elButtonsRate.querySelector<HTMLButtonElement>(SELECTORS.LIKE_BUTTON) ?? undefined,
    elDislike: elButtonsRate.querySelector<HTMLButtonElement>(SELECTORS.DISLIKE_BUTTON) ?? undefined
  };
}

function showIndicator(isRated: boolean) {
  const isShortsOrMusic = [Surface.SHORTS, Surface.MUSIC].includes(getCurrentSurface());
  if (isShortsOrMusic) {
    return;
  }

  showRateBezel(gLastRating, isRated);
}

export function getRatedButton() {
  const { elLike, elDislike } = getRateButtons();
  if (elLike && getIsActive(elLike)) {
    return elLike;
  }

  if (elDislike && getIsActive(elDislike)) {
    return elDislike;
  }

  return null;
}

export function getIsSubscribed() {
  const elSubscribe = document.querySelector(SELECTORS.BUTTON_SUBSCRIBE);
  return elSubscribe?.getAttribute(DomAttribute.SUBSCRIBED) !== null;
}

export function getIsInLibrary() {
  const elFollowButton = document.querySelector(SELECTORS.BUTTON_FOLLOW_MUSIC);
  return elFollowButton?.getAttribute(DomAttribute.SUBSCRIBED) !== null;
}

function getRateActionForFlag(isLike: boolean | null) {
  if (isLike === true) {
    return RateAction.LIKE;
  }

  if (isLike === false) {
    return RateAction.DISLIKE;
  }

  return RateAction.REMOVELIKE;
}

async function rateVideoViaApi(isLike: boolean | null) {
  const action = getRateActionForFlag(isLike);
  const { success } = await sendRateRequest(action);
  if (!success) {
    return;
  }

  const isRatingSet = isLike !== null;
  if (isRatingSet) {
    gLastRating = isLike ? Rating.LIKE : Rating.DISLIKE;
  }

  showIndicator(isRatingSet);
}

/**
 * Rates/un-rates a video on YouTube.com
 * Falls back to YouTube's innertube API when the requested DOM control isn't available
 */
export async function rateVideo(isLike: boolean | null) {
  const { elLike, elDislike } = getRateButtons();

  const isLikeRequested = isLike === true;
  if (isLikeRequested) {
    if (!elLike) {
      await rateVideoViaApi(true);
      return;
    }

    window.ytrUserInteracted = true;
    gLastRating = Rating.LIKE;
    showIndicator(true);

    if (!getIsActive(elLike)) {
      elLike.click();
      elLike.blur();
    }

    return;
  }

  const isDislikeRequested = isLike === false;
  if (isDislikeRequested) {
    if (!elDislike) {
      await rateVideoViaApi(false);
      return;
    }

    window.ytrUserInteracted = true;
    gLastRating = Rating.DISLIKE;
    showIndicator(true);

    if (!getIsActive(elDislike)) {
      elDislike.click();
      elDislike.blur();
    }

    return;
  }

  window.ytrUserInteracted = true;

  const isAnyRateButtonPresent = Boolean(elLike ?? elDislike);
  if (!isAnyRateButtonPresent) {
    await rateVideoViaApi(null);
    return;
  }

  const elRated = getRatedButton();
  if (!elRated) {
    return;
  }

  gLastRating = elRated === elDislike ? Rating.DISLIKE : Rating.LIKE;
  showIndicator(false);
  elRated.click();
  elRated.blur();
}
