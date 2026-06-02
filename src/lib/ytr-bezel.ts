import "@/lib/ytr-bezel.css";
import { createIconElement, svgs } from "@/lib/icons";
import { type Rating } from "@/lib/types";
import { SELECTORS } from "@/lib/utils-initials";

const FALLBACK_BEZEL_CLASS = "ytr-fallback-bezel";
const PLAY_BUTTON_SELECTORS = [".ytp-play-button", ".player-control-play-pause-icon"];
const DEFAULT_PLAY_BUTTON_SIZE = 40;
const BEZEL_CIRCLE_TO_ICON_RATIO = 1.44;
const MAX_Z_INDEX = 2147483647;

function getPlayButtonIconSize() {
  for (const selector of PLAY_BUTTON_SELECTORS) {
    const elPlayButton = document.querySelector<HTMLElement>(selector);
    const measured = elPlayButton?.offsetHeight ?? 0;
    if (measured > 0) {
      return measured;
    }
  }
  return DEFAULT_PLAY_BUTTON_SIZE;
}

function getBezelHost() {
  return document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : document.body;
}


export function showRateBezel(rating: Rating, isRated: boolean) {
  const elPlayer = document.querySelector<HTMLElement>(SELECTORS.moviePlayer);
  if (!elPlayer) {
    return;
  }
  const elHost = getBezelHost();
  elHost.querySelector(`.${FALLBACK_BEZEL_CLASS}`)?.remove();
  const playerRect = elPlayer.getBoundingClientRect();
  const iconSize = getPlayButtonIconSize();
  const circleSize = Math.round(iconSize * BEZEL_CIRCLE_TO_ICON_RATIO);
  const iconName: keyof typeof svgs = isRated ? rating : `un${rating}`;
  const elContainer = document.createElement("div");
  elContainer.className = FALLBACK_BEZEL_CLASS;
  elContainer.style.setProperty("--ytr-bezel-icon-size", `${iconSize}px`);
  elContainer.style.setProperty("--ytr-bezel-circle-size", `${circleSize}px`);
  elContainer.style.top = `${playerRect.top}px`;
  elContainer.style.left = `${playerRect.left}px`;
  elContainer.style.width = `${playerRect.width}px`;
  elContainer.style.height = `${playerRect.height}px`;
  elContainer.style.zIndex = String(MAX_Z_INDEX);
  const elBezel = document.createElement("div");
  elBezel.className = "ytp-bezel";
  elBezel.setAttribute("role", "status");
  const elBezelIcon = document.createElement("div");
  elBezelIcon.className = "ytp-bezel-icon";
  elBezelIcon.append(createIconElement(svgs[iconName]));
  elBezel.append(elBezelIcon);
  elContainer.append(elBezel);
  elBezel.addEventListener("animationend", () => elContainer.remove(), { once: true });
  elHost.append(elContainer);
}
