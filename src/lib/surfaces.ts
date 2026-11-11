import { storage } from "#imports";
import {
  initial,
  StorageKey,
  Surface,
  YOUTUBE_HOST,
  YOUTUBE_PATHNAME
} from "@/lib/utils-initials";

export type EnabledSurfaces = Record<Surface, boolean>;

export function getCurrentSurface() {
  if (location.hostname === YOUTUBE_HOST.music) {
    return Surface.music;
  }
  return location.pathname.startsWith(YOUTUBE_PATHNAME.shorts) ? Surface.shorts : Surface.youtube;
}

export function resolveEnabledSurfaces(stored: Partial<EnabledSurfaces> | null): EnabledSurfaces {
  return { ...initial.enabledSurfaces, ...stored };
}

export async function getEnabledSurfaces() {
  return resolveEnabledSurfaces(await storage.getItem<Partial<EnabledSurfaces>>(StorageKey.enabledSurfaces));
}

export async function getIsCurrentSurfaceEnabled() {
  const enabledSurfaces = await getEnabledSurfaces();
  return enabledSurfaces[getCurrentSurface()];
}

export function watchEnabledSurfaces(onChange: (enabledSurfaces: EnabledSurfaces) => void) {
  return storage.watch<Partial<EnabledSurfaces>>(StorageKey.enabledSurfaces, stored => {
    onChange(resolveEnabledSurfaces(stored));
  });
}

export function watchIsCurrentSurfaceEnabled(onChange: (isEnabled: boolean) => void) {
  return watchEnabledSurfaces(enabledSurfaces => {
    onChange(enabledSurfaces[getCurrentSurface()]);
  });
}
