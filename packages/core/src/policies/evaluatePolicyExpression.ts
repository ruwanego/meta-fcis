import { ExpressionScope } from "../expressions/types.js";
import { resolveExpression } from "../expressions/resolveExpression.js";
import {
  PolicyEvaluationResult,
  EvaluatePolicyExpressionArgs,
} from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function resolvePolicyValue(
  value: unknown,
  scope: ExpressionScope
): { ok: true; value: unknown } | { ok: false; error: unknown } {
  if (typeof value === "string" && value.startsWith("$")) {
    const resolution = resolveExpression({ expression: value, scope });
    if (!resolution.ok) {
      return { ok: false, error: resolution };
    }
    return { ok: true, value: resolution.value };
  }
  return { ok: true, value };
}

export function evaluatePolicyExpression(
  args: EvaluatePolicyExpressionArgs
): PolicyEvaluationResult {
  const { expression, scope } = args;

  // A. Boolean literal
  if (expression === true) {
    return { ok: true, value: true };
  }
  if (expression === false) {
    return { ok: true, value: false };
  }

  // B. Must be a plain object with exactly one own key
  if (!isPlainObject(expression)) {
    return {
      ok: false,
      error: { reason: "POLICY_EXPRESSION_INVALID" },
    };
  }

  const keys = Object.keys(expression);
  if (keys.length !== 1) {
    return {
      ok: false,
      error: { reason: "POLICY_EXPRESSION_INVALID" },
    };
  }

  const operator = keys[0];
  const operand = expression[operator];

  switch (operator) {
    case "eq":
    case "neq": {
      // Must be array length 2
      if (!Array.isArray(operand) || operand.length !== 2) {
        return {
          ok: false,
          error: {
            reason: "POLICY_OPERATOR_ARITY_INVALID",
            operator,
          },
        };
      }

      const leftRes = resolvePolicyValue(operand[0], scope);
      if (!leftRes.ok) {
        return {
          ok: false,
          error: {
            reason: "POLICY_VALUE_RESOLUTION_FAILED",
            operator,
            details: leftRes.error,
          },
        };
      }

      const rightRes = resolvePolicyValue(operand[1], scope);
      if (!rightRes.ok) {
        return {
          ok: false,
          error: {
            reason: "POLICY_VALUE_RESOLUTION_FAILED",
            operator,
            details: rightRes.error,
          },
        };
      }

      const isEqual = Object.is(leftRes.value, rightRes.value);
      return { ok: true, value: operator === "eq" ? isEqual : !isEqual };
    }

    case "and": {
      if (!Array.isArray(operand) || operand.length === 0) {
        return {
          ok: false,
          error: {
            reason: "POLICY_OPERATOR_ARITY_INVALID",
            operator,
          },
        };
      }

      for (const item of operand) {
        const result = evaluatePolicyExpression({ expression: item, scope });
        if (!result.ok) {
          return result;
        }
        if (result.value === false) {
          return { ok: true, value: false };
        }
      }

      return { ok: true, value: true };
    }

    case "or": {
      if (!Array.isArray(operand) || operand.length === 0) {
        return {
          ok: false,
          error: {
            reason: "POLICY_OPERATOR_ARITY_INVALID",
            operator,
          },
        };
      }

      for (const item of operand) {
        const result = evaluatePolicyExpression({ expression: item, scope });
        if (!result.ok) {
          return result;
        }
        if (result.value === true) {
          return { ok: true, value: true };
        }
      }

      return { ok: true, value: false };
    }

    case "not": {
      const result = evaluatePolicyExpression({ expression: operand, scope });
      if (!result.ok) {
        return result;
      }
      return { ok: true, value: !result.value };
    }

    case "exists": {
      if (typeof operand === "string" && operand.startsWith("$")) {
        const resolution = resolveExpression({ expression: operand, scope });
        if (resolution.ok) {
          return {
            ok: true,
            value: resolution.value !== null && resolution.value !== undefined,
          };
        }
        // Certain failure reasons mean "does not exist" rather than hard error
        if (
          resolution.reason === "PATH_NOT_FOUND" ||
          resolution.reason === "PATH_NOT_TRAVERSABLE" ||
          resolution.reason === "NULL_SCOPE"
        ) {
          return { ok: true, value: false };
        }
        return {
          ok: false,
          error: {
            reason: "POLICY_VALUE_RESOLUTION_FAILED",
            operator,
            details: resolution,
          },
        };
      }
      // Non-expression literal
      return {
        ok: true,
        value: operand !== null && operand !== undefined,
      };
    }

    case "in": {
      if (!Array.isArray(operand) || operand.length !== 2) {
        return {
          ok: false,
          error: {
            reason: "POLICY_OPERATOR_ARITY_INVALID",
            operator,
          },
        };
      }

      const needleRes = resolvePolicyValue(operand[0], scope);
      if (!needleRes.ok) {
        return {
          ok: false,
          error: {
            reason: "POLICY_VALUE_RESOLUTION_FAILED",
            operator,
            details: needleRes.error,
          },
        };
      }

      const haystackRes = resolvePolicyValue(operand[1], scope);
      if (!haystackRes.ok) {
        return {
          ok: false,
          error: {
            reason: "POLICY_VALUE_RESOLUTION_FAILED",
            operator,
            details: haystackRes.error,
          },
        };
      }

      if (!Array.isArray(haystackRes.value)) {
        return {
          ok: false,
          error: {
            reason: "POLICY_OPERATOR_ARITY_INVALID",
            operator,
            details: "haystack must be an array",
          },
        };
      }

      const found = (haystackRes.value as unknown[]).some((item) =>
        Object.is(item, needleRes.value)
      );
      return { ok: true, value: found };
    }

    default:
      return {
        ok: false,
        error: {
          reason: "POLICY_OPERATOR_UNKNOWN",
          operator,
        },
      };
  }
}
