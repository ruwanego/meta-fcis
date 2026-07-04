export interface DependencyConfig {
  resource: string;
  params?: Record<string, unknown>;
}

export type FieldType = "string" | "number" | "boolean" | "object" | "array" | "unknown";
export type EntityDeletePolicy = "hard" | "soft" | "forbidden";
export type IntentOperation = "CREATE" | "UPDATE" | "DELETE";

export interface FieldDefinition {
  type: FieldType | string;
  required: boolean;
  mutable: boolean;
  creatable: boolean;
  serverOwned: boolean;
  isId?: boolean;
}

export interface EntityDefinition {
  table: string;
  idField: string;
  deletePolicy: EntityDeletePolicy;
  fields: Record<string, FieldDefinition>;
}

export interface AllowedIntentDefinition {
  type: "MUTATE_ENTITY";
  entity: string;
  operation: IntentOperation | string;
  fields: string[];
  targetId?: unknown;
}

export interface RouteDefinition {
  auth?: {
    required: boolean;
    roles?: string[];
  };
  input?: unknown;
  output?: unknown;
  handler?: {
    kind: string;
    file: string;
    function: string;
  };
  dependencies?: Record<string, DependencyConfig | DependencySelector>;
  allowedIntents?: AllowedIntentDefinition[];
}

export interface RouteConfig extends RouteDefinition {
  path: string;
  schema?: string | Record<string, unknown>;
  dependencies?: Record<string, DependencyConfig>;
  pureFunction: string;
}

export interface AppGraph {
  version: string;
  irVersion?: string;
  application?: {
    name: string;
  };
  engineCompatibility?: {
    min: string;
    max: string;
  };
  entities?: Record<string, EntityDefinition>;
  models?: Record<string, unknown>;
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

export type PolicyEffect = "allow" | "deny";

export interface PolicyDefinition {
  effect: PolicyEffect;
  when: unknown;
}
