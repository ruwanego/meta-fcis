import type { DependencySelector } from "../graph/types.js";
import type { ExpressionScope } from "../expressions/types.js";

export interface ResolvedDependencySelector {
  entity: string;
  cardinality: DependencySelector["cardinality"];
  where: Record<string, unknown>;
  project: string[];
  limit?: number;
  orderBy?: DependencySelector["orderBy"];
  onMissing: DependencySelector["onMissing"];
}

export type SelectorResolutionErrorReason =
  | "SELECTOR_WHERE_NOT_OBJECT"
  | "SELECTOR_FIELD_INVALID"
  | "EXPRESSION_RESOLUTION_FAILED";

export interface SelectorResolutionError {
  reason: SelectorResolutionErrorReason;
  field?: string;
  details?: unknown;
}

export type SelectorResolutionResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: SelectorResolutionError;
    };

export interface ResolveDependencySelectorArgs {
  selector: DependencySelector;
  scope: ExpressionScope;
}

export interface ResolveDependencySelectorsArgs {
  selectors: Record<string, DependencySelector>;
  scope: ExpressionScope;
}
