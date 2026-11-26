import { z } from "@/lib/zod";

export const MODIFIER_KEYS = ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const;

const modifierSchema = z.enum(MODIFIER_KEYS);

export type Modifier = z.infer<typeof modifierSchema>;

export const buttonTriggerSchema = z.object({
  primary: z.array(z.string()),
  modifiers: z.array(modifierSchema),
  secondary: z.boolean()
});

export type ButtonTrigger = z.infer<typeof buttonTriggerSchema>;

export type ButtonTriggers = Record<"like" | "dislike" | "unrate", ButtonTrigger>;
