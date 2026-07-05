import { Actor } from "../protocol/actor.js";
import { Request } from "../protocol/request.js";
import { ContextBundle } from "../protocol/context.js";
import { IntentSet } from "../protocol/intent.js";
import { ResolvedDependencySelector } from "../selectors/types.js";

export interface SchemaAdapter {
  validate(schema: unknown, payload: unknown): Promise<unknown> | unknown;
}

export interface AuthAdapter {
  authenticate(
    request: Request,
    authConfig?: { required: boolean; roles?: string[] }
  ): Promise<Actor> | Actor;
}

export interface PersistenceAdapter {
  loadDependencies(
    dependencies: Record<string, ResolvedDependencySelector>
  ): Promise<Record<string, unknown>> | Record<string, unknown>;
}

export interface PureInvoker {
  invoke(functionName: string, context: ContextBundle): Promise<IntentSet> | IntentSet;
}

export interface RuntimeAdapters {
  schema: SchemaAdapter;
  auth: AuthAdapter;
  persistence: PersistenceAdapter;
  pureInvoker: PureInvoker;
}
