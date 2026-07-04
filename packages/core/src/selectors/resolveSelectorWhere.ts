import { ExpressionScope } from "../expressions/types.js";
import { resolveExpression } from "../expressions/resolveExpression.js";
import { SelectorResolutionResult } from "./types.js";

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

export function resolveSelectorWhere(args: {
  where: Record<string, unknown>;
  scope: ExpressionScope;
}): SelectorResolutionResult<Record<string, unknown>> {
  const { where, scope } = args;

  if (!isPlainObject(where)) {
    return {
      ok: false,
      error: {
        reason: "SELECTOR_WHERE_NOT_OBJECT",
      },
    };
  }

  const resolved: Record<string, unknown> = {};

  for (const field of Object.keys(where)) {
    if (field === "") {
      return {
        ok: false,
        error: {
          reason: "SELECTOR_FIELD_INVALID",
          field,
        },
      };
    }

    if (!Object.prototype.hasOwnProperty.call(where, field)) {
      continue;
    }

    const value = where[field];

    if (typeof value === "string" && value.startsWith("$")) {
      const resolution = resolveExpression({ expression: value, scope });
      if (!resolution.ok) {
        return {
          ok: false,
          error: {
            reason: "EXPRESSION_RESOLUTION_FAILED",
            field,
            details: resolution,
          },
        };
      }
      resolved[field] = resolution.value;
    } else {
      resolved[field] = value;
    }
  }

  return {
    ok: true,
    value: resolved,
  };
}
