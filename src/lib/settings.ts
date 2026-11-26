import { storage } from "#imports";
import { type ButtonTrigger, buttonTriggerSchema } from "@/lib/button-triggers";
import { ThemeMode } from "@/lib/theme-mode";
import { initial, StorageKey, Surface } from "@/lib/utils-initials";
import { z } from "@/lib/zod";

function createStoredTriggerSchema(fallback: ButtonTrigger) {
  const { primary, modifiers, secondary } = buttonTriggerSchema.shape;
  return z
    .object({
      primary: primary.catch(fallback.primary),
      modifiers: modifiers.catch(fallback.modifiers),
      secondary: secondary.catch(fallback.secondary)
    })
    .catch(fallback);
}

const buttonTriggersSchema = z
  .object({
    like: createStoredTriggerSchema(initial.buttonTriggers.like),
    dislike: createStoredTriggerSchema(initial.buttonTriggers.dislike),
    unrate: createStoredTriggerSchema(initial.buttonTriggers.unrate)
  })
  .catch(initial.buttonTriggers);

const enabledSurfacesSchema = z
  .object({
    [Surface.YOUTUBE]: z.boolean().catch(initial.enabledSurfaces[Surface.YOUTUBE]),
    [Surface.SHORTS]: z.boolean().catch(initial.enabledSurfaces[Surface.SHORTS]),
    [Surface.MUSIC]: z.boolean().catch(initial.enabledSurfaces[Surface.MUSIC])
  })
  .catch(initial.enabledSurfaces);

export type EnabledSurfaces = z.infer<typeof enabledSurfacesSchema>;

const watchProgressSchema = z
  .record(
    z.string(),
    z.object({
      percentage: z.number(),
      updatedAt: z.number()
    })
  )
  .catch({});

export type WatchProgress = z.infer<typeof watchProgressSchema>;

// Each schema ends in a `catch`, so a missing or malformed stored value reads as its fallback
function createSetting<Schema extends z.ZodType>({ key, schema }: { key: StorageKey; schema: Schema }) {
  return {
    async read() {
      const stored = await storage.getItem(key).catch(() => null);
      return schema.parse(stored);
    },
    watch(onChange: (value: z.infer<Schema>) => void) {
      return storage.watch(key, stored => onChange(schema.parse(stored)));
    },
    write(value: z.infer<Schema>) {
      return storage.setItem(key, value);
    }
  };
}

export const settings = {
  buttonTriggers: createSetting({
    key: StorageKey.BUTTON_TRIGGERS,
    schema: buttonTriggersSchema
  }),
  enabledSurfaces: createSetting({
    key: StorageKey.ENABLED_SURFACES,
    schema: enabledSurfacesSchema
  }),
  isAutoLike: createSetting({
    key: StorageKey.IS_AUTO_LIKE,
    schema: z.boolean().catch(initial.isAutoLike)
  }),
  isAutoLikeSubscribedChannels: createSetting({
    key: StorageKey.IS_AUTO_LIKE_SUBSCRIBED_CHANNELS,
    schema: z.boolean().catch(initial.isAutoLikeSubscribedChannels)
  }),
  autoLikeThreshold: createSetting({
    key: StorageKey.AUTO_LIKE_THRESHOLD,
    schema: z.number().catch(initial.autoLikeThreshold)
  }),
  theme: createSetting({
    key: StorageKey.THEME,
    schema: z.enum(ThemeMode).catch(ThemeMode.AUTO)
  }),
  watchProgress: createSetting({
    key: StorageKey.WATCH_PROGRESS,
    schema: watchProgressSchema
  })
};
