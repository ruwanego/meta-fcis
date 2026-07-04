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

export interface DependencySelector {
  entity: string;
  cardinality: "one" | "many";
  where: Record<string, unknown>;
  project: string[];
  limit?: number;
  orderBy?: string | { field: string; direction: "asc" | "desc" }[];
  onMissing: "null" | "error";
}

