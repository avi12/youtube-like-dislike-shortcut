import { storage } from "#imports";
import { StorageKey, URL_PARAM } from "@/lib/utils-initials";

const MAXIMUM_REAL_SECONDS_BETWEEN_TIME_UPDATES = 1;
const RETENTION_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAXIMUM_STORED_VIDEOS = 100;
const MINIMUM_MILLISECONDS_BETWEEN_SAVES = 5000;

interface WatchProgressEntry {
  percentage: number;
  updatedAt: number;
}

type WatchProgress = Record<string, WatchProgressEntry>;

let lastSaveTime = 0;
let pendingWrite = Promise.resolve();

export function getWatchedSeconds(previousTime: number, currentTime: number, playbackRate: number) {
  const delta = currentTime - previousTime;
  const maximumDelta = MAXIMUM_REAL_SECONDS_BETWEEN_TIME_UPDATES * Math.max(playbackRate, 1);
  const isContinuousPlayback = delta > 0 && delta < maximumDelta;
  return isContinuousPlayback ? delta : 0;
}

function getVideoId() {
  return new URLSearchParams(location.search).get(URL_PARAM.videoId);
}

function pruneProgress(progress: WatchProgress) {
  const oldestAllowedTime = Date.now() - RETENTION_DAYS * MILLISECONDS_PER_DAY;
  return Object.fromEntries(
    Object.entries(progress)
      .filter(([, entry]) => entry.updatedAt >= oldestAllowedTime)
      .sort(([, first], [, second]) => second.updatedAt - first.updatedAt)
      .slice(0, MAXIMUM_STORED_VIDEOS)
  );
}

async function readProgress() {
  const stored = await storage.getItem<WatchProgress>(StorageKey.watchProgress);
  return pruneProgress(stored ?? {});
}

function updateProgress(update: (progress: WatchProgress) => WatchProgress) {
  pendingWrite = pendingWrite.then(async () => {
    const updated = update(await readProgress());
    await storage.setItem(StorageKey.watchProgress, updated);
  });
  return pendingWrite;
}

export async function loadWatchedPercentage() {
  const videoId = getVideoId();
  if (!videoId) {
    return 0;
  }
  const progress = await readProgress();
  return progress[videoId]?.percentage ?? 0;
}

export async function saveWatchedPercentage(percentage: number) {
  const videoId = getVideoId();
  const isSaveDue = Date.now() - lastSaveTime >= MINIMUM_MILLISECONDS_BETWEEN_SAVES;
  if (!videoId || !isSaveDue) {
    return;
  }
  lastSaveTime = Date.now();
  await updateProgress(progress => ({ ...progress, [videoId]: { percentage, updatedAt: Date.now() } }));
}

export async function clearWatchedPercentage() {
  const videoId = getVideoId();
  if (!videoId) {
    return;
  }
  await updateProgress(progress =>
    Object.fromEntries(Object.entries(progress).filter(([storedVideoId]) => storedVideoId !== videoId))
  );
}
