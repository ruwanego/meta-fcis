import { ExpressionScope, ExpressionResolution } from "./types.js";
import { resolvePath } from "./resolvePath.js";

export function resolveExpression(args: {
  expression: unknown;
  scope: ExpressionScope;
}): ExpressionResolution {
  const { expression, scope } = args;

  if (typeof expression !== "string") {
    return {
      ok: false,
      reason: "EXPRESSION_NOT_STRING",
    };
  }

  if (!expression.startsWith("$")) {
    return {
      ok: false,
      reason: "EXPRESSION_NOT_PATH",
    };
  }

  const path = expression.slice(1);
  if (!path) {
    return {
      ok: false,
      reason: "EXPRESSION_NOT_PATH",
    };
  }

  const segments = path.split(".");
  const firstSegment = segments[0];

  if (
    firstSegment !== "request" &&
    firstSegment !== "actor" &&
    firstSegment !== "dependencies"
  ) {
    return {
      ok: false,
      reason: "UNKNOWN_SCOPE",
    };
  }

  const root = scope[firstSegment];

  if (root === null) {
    return {
      ok: false,
      reason: "NULL_SCOPE",
    };
  }

  const remainingSegments = segments.slice(1);

  return resolvePath({
    root,
    segments: remainingSegments,
  });
}
