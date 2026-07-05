// Protocol
export type { Actor } from "./protocol/actor.js";
export type { ContextBundle } from "./protocol/context.js";
export type {
  EntityMutationOperation,
  MutateEntityInstruction,
  MetaInstruction,
  IntentSet,
} from "./protocol/intent.js";
export type { Request } from "./protocol/request.js";
export type { ExecuteRouteResult } from "./protocol/response.js";

// Graph
export type {
  RouteConfig,
  RouteDefinition,
  AppGraph,
  FieldType,
  FieldDefinition,
  ModelFieldDefinition,
  ModelDefinition,
  EntityDefinition,
  EntityDeletePolicy,
  AllowedIntentDefinition,
  IntentOperation,
  DependencySelector,
  DependencyCardinality,
  SortDirection,
  OnMissingBehavior,
  PolicyEffect,
  PolicyDefinition,
} from "./graph/types.js";
export { validateGraph } from "./graph/validateGraph.js";
export { loadGraph } from "./graph/loadGraph.js";

// Engine
export { ENGINE_VERSION } from "./version.js";

// Adapters
export type {
  SchemaAdapter,
  AuthAdapter,
  PersistenceAdapter,
  PureInvoker,
  TransactionExecutor,
  RuntimeAdapters,
} from "./adapters/types.js";

// Errors
export { RuntimeError } from "./errors/RuntimeError.js";
export type { RuntimeErrorCode } from "./errors/RuntimeError.js";

// Pipeline
export { executeRoute } from "./pipeline/executeRoute.js";
export { validateIntentSet } from "./pipeline/validateIntentSet.js";

// Expressions
export type {
  ExpressionScopeName,
  ExpressionScope,
  ExpressionResolution,
} from "./expressions/types.js";
export { resolvePath } from "./expressions/resolvePath.js";
export { resolveExpression } from "./expressions/resolveExpression.js";

// Selectors
export type {
  ResolvedDependencySelector,
  SelectorResolutionErrorReason,
  SelectorResolutionError,
  SelectorResolutionResult,
  ResolveDependencySelectorArgs,
  ResolveDependencySelectorsArgs,
} from "./selectors/types.js";
export { resolveSelectorWhere } from "./selectors/resolveSelectorWhere.js";
export { resolveDependencySelector } from "./selectors/resolveDependencySelector.js";
export { resolveDependencySelectors } from "./selectors/resolveDependencySelectors.js";

// Policies
export type {
  PolicyOperator,
  PolicyEvaluationErrorReason,
  PolicyEvaluationError,
  PolicyEvaluationResult,
  EvaluatePolicyExpressionArgs,
  EvaluatePolicyArgs,
} from "./policies/types.js";
export { evaluatePolicyExpression } from "./policies/evaluatePolicyExpression.js";
export { evaluatePolicy } from "./policies/evaluatePolicy.js";

// Intents
export type {
  IntentAuthorizationErrorReason,
  IntentAuthorizationError,
  IntentAuthorizationResult,
  AuthorizeIntentArgs,
  AuthorizeIntentSetArgs,
} from "./intents/types.js";
export { authorizeIntent } from "./intents/authorizeIntent.js";
export { authorizeIntentSet } from "./intents/authorizeIntentSet.js";

// Transactions
export type {
  TransactionOperationKind,
  CreateOperation,
  UpdateOperation,
  DeleteOperation,
  TransactionOperation,
  TransactionPlan,
  TransactionOperationResult,
  TransactionExecutionResult,
  TransactionPlanErrorReason,
  TransactionPlanError,
  TransactionPlanResult,
} from "./transactions/types.js";
export { buildTransactionPlan } from "./transactions/buildTransactionPlan.js";
