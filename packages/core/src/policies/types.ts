import type { PolicyDefinition } from "../graph/types.js";
import type { ExpressionScope } from "../expressions/types.js";

export type PolicyOperator =
  | "eq"
  | "neq"
  | "and"
  | "or"
  | "not"
  | "exists"
  | "in";

export type PolicyEvaluationErrorReason =
  | "POLICY_EXPRESSION_INVALID"
  | "POLICY_OPERATOR_UNKNOWN"
  | "POLICY_OPERATOR_ARITY_INVALID"
  | "POLICY_VALUE_RESOLUTION_FAILED"
  | "POLICY_RESULT_NOT_BOOLEAN";

export interface PolicyEvaluationError {
  reason: PolicyEvaluationErrorReason;
  operator?: string;
  details?: unknown;
}

export type PolicyEvaluationResult =
  | {
      ok: true;
      value: boolean;
    }
  | {
      ok: false;
      error: PolicyEvaluationError;
    };

export interface EvaluatePolicyExpressionArgs {
  expression: unknown;
  scope: ExpressionScope;
}

export interface EvaluatePolicyArgs {
  policy: PolicyDefinition | undefined;
  scope: ExpressionScope;
}
