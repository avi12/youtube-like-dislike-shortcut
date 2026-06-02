import { Rating } from "@/lib/types";
import { DOM_ATTRIBUTE, SELECTORS, YOUTUBE_HOST, YOUTUBE_PATHNAME } from "@/lib/utils-initials";
import { showRateBezel } from "@/lib/ytr-bezel";
import { RateAction, YtrMessage, ytrMessenger } from "@/lib/ytr-messaging";

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

export function getRateButtons() {
  const selector = `${SELECTORS.toggleButtonsNormalVideo}, ${SELECTORS.toggleButtonsShortsVideo}, ${SELECTORS.toggleButtonsMusicVideo}`;
  const elButtonsRate = document.querySelector<HTMLElement>(selector);
  const isButtonsRatePresent = elButtonsRate !== null;
  if (!isButtonsRatePresent) {
    return [];
  }
  const buttons = [...elButtonsRate.querySelectorAll<HTMLButtonElement>(`button[${DOM_ATTRIBUTE.ariaPressed}]`)];
  const isYouTubeMusic = getIsYouTubeMusic();
  if (isYouTubeMusic) {
    buttons.reverse();
  }
  return buttons;
}

function showIndicator(isRated: boolean) {
  const isShortsOrMusic = getIsShorts() || getIsYouTubeMusic();
  if (isShortsOrMusic) {
    return;
  }
  showRateBezel(gLastRating, isRated);
}

export function getRatedButton() {
  const { toggleButtonsShortsVideo, toggleButtonsNormalVideo, toggleButtonsMusicVideo } = SELECTORS;
  return document.querySelector<HTMLButtonElement>(`:where(${toggleButtonsNormalVideo}, ${toggleButtonsShortsVideo}, ${toggleButtonsMusicVideo}) button[${DOM_ATTRIBUTE.ariaPressed}=true]`);
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
  const { success } = await ytrMessenger.sendMessage(YtrMessage.rateVideo, action);
  const isSuccessful = success;
  if (!isSuccessful) {
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
 * Falls back to YouTube's innertube API when DOM buttons aren't available
 * (channel trailers, embedded videos)
 */
export async function rateVideo(isLike: boolean | null) {
  const [elLike, elDislike] = getRateButtons();

  const isLikeButtonPresent = elLike !== undefined;
  if (!isLikeButtonPresent) {
    await rateVideoViaApi(isLike);
    return;
  }

  window.ytrUserInteracted = true;
  const isLikeRequested = isLike === true;
  if (isLikeRequested) {
    gLastRating = Rating.Like;
    showIndicator(true);

    const isLikeActive = getIsActive(elLike);
    if (!isLikeActive) {
      elLike.click();
      elLike.blur();
    }
    return;
  }

  const isDislikeRequested = isLike === false;
  if (isDislikeRequested) {
    gLastRating = Rating.Dislike;
    showIndicator(true);

    const isDislikeActive = getIsActive(elDislike);
    if (!isDislikeActive) {
      elDislike.click();
      elDislike.blur();
    }
    return;
  }

  const elBtnActive = getRatedButton();

  const isActiveButtonPresent = elBtnActive !== null;
  if (!isActiveButtonPresent) {
    await rateVideoViaApi(null);
    return;
  }

  const isLastRatingSet = Boolean(gLastRating);
  if (!isLastRatingSet) {
    gLastRating = elBtnActive === elDislike ? Rating.Dislike : Rating.Like;
  }
  showIndicator(false);

  elBtnActive.click();
  elBtnActive.blur();
}
