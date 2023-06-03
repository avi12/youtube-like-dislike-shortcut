import { modifierToKeyDisplay } from "./mappers";
import type { ButtonTrigger } from "~types";

export function getJoinedModifiers(trigger: ButtonTrigger): string {
  return [...trigger.modifiers.map(modifier => modifierToKeyDisplay[modifier]), trigger.primary].join(" + ");
}
