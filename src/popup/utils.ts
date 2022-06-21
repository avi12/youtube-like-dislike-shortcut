import type { ButtonTrigger } from "../types";
import { modifierToKeyDisplay } from "./mappers";

export function getJoinedModifiers(trigger: ButtonTrigger): string {
  return [...trigger.modifiers.map(modifier => modifierToKeyDisplay[modifier]), trigger.primary].join(" + ");
}
