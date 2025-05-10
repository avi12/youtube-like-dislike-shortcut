import { initial } from "@/lib/utils-initials";

export const autoLikeManager = $state<{
  isAutoLike: typeof initial.isAutoLike;
  autoLikeThreshold: typeof initial.autoLikeThreshold;
  isAutoLikeSubscribedChannels: typeof initial.isAutoLikeSubscribedChannels;
}>({
  isAutoLike: initial.isAutoLike,
  autoLikeThreshold: initial.autoLikeThreshold,
  isAutoLikeSubscribedChannels: initial.isAutoLikeSubscribedChannels
});
