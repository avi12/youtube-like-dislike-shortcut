import {Rating} from "@/lib/types";
import {DOM_ATTRIBUTE, SELECTORS, YOUTUBE_HOST, YOUTUBE_PATHNAME} from "@/lib/utils-initials";
import {showRateBezel} from "@/lib/ytr-bezel";
import {RateAction, sendRateRequest} from "@/lib/ytr-messaging";

let gLastRating = Rating.Like;

function getIsActive(elButton: HTMLElement) {
  return elButton.ariaPressed === "true";
}

function getIsYouTubeMusic() {
  return location.hostname === YOUTUBE_HOST.music;
}

function getIsShorts() {
  return location.pathname.startsWith(YOUTUBE_PATHNAME.shorts);
}

function getShortsRateButtons() {
  const elActionBar = document.querySelector<HTMLElement>(SELECTORS.toggleButtonsShortsVideo);
  if (elActionBar === null) {
    return {};
  }

  const rateButtonsSelector = `${SELECTORS.likeButton}, ${SELECTORS.dislikeButton}`;
  const elKnownRateButtons = elActionBar.querySelectorAll<HTMLButtonElement>(rateButtonsSelector);
  const elToggleButtons = elKnownRateButtons.length > 0
    ? elKnownRateButtons
    : elActionBar.querySelectorAll<HTMLButtonElement>(`button[${DOM_ATTRIBUTE.ariaPressed}]`);
  return {
    elLike: elToggleButtons.item(0) ?? undefined,
    elDislike: elToggleButtons.item(1) ?? undefined
  };
}

export function getRateButtons() {
  if (getIsShorts()) {
    return getShortsRateButtons();
  }
  const containerSelector = `${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsMusicVideo}`;
  const elButtonsRate = document.querySelector<HTMLElement>(containerSelector);
  if (elButtonsRate === null) {
    return {};
  }
  return {
    elLike: elButtonsRate.querySelector<HTMLButtonElement>(SELECTORS.likeButton) ?? undefined,
    elDislike: elButtonsRate.querySelector<HTMLButtonElement>(SELECTORS.dislikeButton) ?? undefined
  };
}

function showIndicator(isRated: boolean) {
  const isShortsOrMusic = getIsShorts() || getIsYouTubeMusic();
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
  const elSubscribe = document.querySelector(SELECTORS.buttonSubscribe);
  return elSubscribe?.getAttribute(DOM_ATTRIBUTE.subscribed) !== null;
}

export function getIsInLibrary() {
  const elFollowButton = document.querySelector(SELECTORS.buttonFollowMusic);
  return elFollowButton?.getAttribute(DOM_ATTRIBUTE.subscribed) !== null;
}

function getRateActionForFlag(isLike: boolean | null) {
  if (isLike === true) {
    return RateAction.like;
  }
  if (isLike === false) {
    return RateAction.dislike;
  }
  return RateAction.removelike;
}

async function rateVideoViaApi(isLike: boolean | null) {
  const action = getRateActionForFlag(isLike);
  const { success } = await sendRateRequest(action);
  if (!success) {
    return;
  }
  const isRatingSet = isLike !== null;
  if (isRatingSet) {
    gLastRating = isLike ? Rating.Like : Rating.Dislike;
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
    gLastRating = Rating.Like;
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
    gLastRating = Rating.Dislike;
    showIndicator(true);
    if (!getIsActive(elDislike)) {
      elDislike.click();
      elDislike.blur();
    }
    return;
  }

  if (!elLike) {
    await rateVideoViaApi(null);
    return;
  }

  if (!getIsActive(elLike)) {
    return;
  }

  window.ytrUserInteracted = true;
  gLastRating = Rating.Like;
  showIndicator(false);
  elLike.click();
  elLike.blur();
}
