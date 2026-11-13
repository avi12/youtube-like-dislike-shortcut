import { storage } from "#imports";
import { getCurrentSurface, initial, StorageKey, type Surface } from "@/lib/utils-initials";

export type EnabledSurfaces = Record<Surface, boolean>;

export function resolveEnabledSurfaces(stored: Partial<EnabledSurfaces> | null) {
  return {
    ...initial.enabledSurfaces,
    ...stored
  };
}

export async function getEnabledSurfaces() {
  return resolveEnabledSurfaces(await storage.getItem<Partial<EnabledSurfaces>>(StorageKey.ENABLED_SURFACES));
}

export async function getIsCurrentSurfaceEnabled() {
  const enabledSurfaces = await getEnabledSurfaces();
  return enabledSurfaces[getCurrentSurface()];
}

export function watchEnabledSurfaces(onChange: (enabledSurfaces: EnabledSurfaces) => void) {
  return storage.watch<Partial<EnabledSurfaces>>(StorageKey.ENABLED_SURFACES, stored => {
    onChange(resolveEnabledSurfaces(stored));
  });
}

export function watchIsCurrentSurfaceEnabled(onChange: (isEnabled: boolean) => void) {
  return watchEnabledSurfaces(enabledSurfaces => {
    onChange(enabledSurfaces[getCurrentSurface()]);
  });
}
