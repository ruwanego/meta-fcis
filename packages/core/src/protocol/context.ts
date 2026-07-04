import { Actor } from "./actor.js";

export interface ContextBundle {
  actor: Actor;
  data: unknown;
  dependencies: Record<string, unknown>;
}
