import { z } from "@/lib/zod";
import { createLazyGuard } from "@/lib/zod-guard";

export const isElement = createLazyGuard(() => z.instanceof(Element));
export const isHtmlElement = createLazyGuard(() => z.instanceof(HTMLElement));
export const isAnchorElement = createLazyGuard(() => z.instanceof(HTMLAnchorElement));
export const isVideoElement = createLazyGuard(() => z.instanceof(HTMLVideoElement));
export const isCustomEvent = createLazyGuard(() => z.instanceof(CustomEvent));
