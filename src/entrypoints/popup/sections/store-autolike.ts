import { writable } from "svelte/store";
import { initial } from "@/lib/utils-initials";

export const isAutoLike = writable<typeof initial.isAutoLike>();
export const autoLikeThreshold = writable<typeof initial.autoLikeThreshold>();
export const isAutoLikeSubscribedChannels = writable<typeof initial.isAutoLikeSubscribedChannels>();
