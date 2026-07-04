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
