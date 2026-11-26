import { settings } from "@/lib/settings";
import { getCurrentSurface } from "@/lib/utils-initials";

export async function getIsCurrentSurfaceEnabled() {
  const enabledSurfaces = await settings.enabledSurfaces.read();
  return enabledSurfaces[getCurrentSurface()];
}

export function watchIsCurrentSurfaceEnabled(onChange: (isEnabled: boolean) => void) {
  return settings.enabledSurfaces.watch(enabledSurfaces => {
    onChange(enabledSurfaces[getCurrentSurface()]);
  });
}
