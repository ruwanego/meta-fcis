import {
  EvaluatePolicyArgs,
  PolicyEvaluationResult,
} from "./types.js";
import { evaluatePolicyExpression } from "./evaluatePolicyExpression.js";

export function evaluatePolicy(
  args: EvaluatePolicyArgs
): PolicyEvaluationResult {
  const { policy, scope } = args;

  // No policy means allow by default
  if (policy === undefined) {
    return { ok: true, value: true };
  }

  const whenResult = evaluatePolicyExpression({
    expression: policy.when,
    scope,
  });

  if (!whenResult.ok) {
    return whenResult;
  }

  if (policy.effect === "allow") {
    return { ok: true, value: whenResult.value };
  }

  if (policy.effect === "deny") {
    return { ok: true, value: !whenResult.value };
  }

  return {
    ok: false,
    error: {
      reason: "POLICY_EXPRESSION_INVALID",
      details: `Unknown policy effect: ${String(policy.effect)}`,
    },
  };
}
