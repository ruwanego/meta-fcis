export interface DependencyConfig {
  resource: string;
  params?: Record<string, unknown>;
}

export interface RouteConfig {
  path: string;
  schema?: string | Record<string, unknown>;
  auth?: {
    required: boolean;
    roles?: string[];
  };
  dependencies?: Record<string, DependencyConfig>;
  pureFunction: string;
}

export interface AppGraph {
  version: string;
  routes: Record<string, RouteConfig>;
}

export type DependencyCardinality = "one" | "many";
export type SortDirection = "asc" | "desc";
export type OnMissingBehavior = "null" | "empty" | "error";

export interface DependencySelector {
  entity: string;
  cardinality: DependencyCardinality;
  where: Record<string, unknown>;
  project: string[];
  limit?: number;
  orderBy?: Array<{
    field: string;
    direction: SortDirection;
  }>;
  onMissing: OnMissingBehavior;
}
