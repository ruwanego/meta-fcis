import { ExpressionResolution } from "./types.js";

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

export function resolvePath(args: {
  root: unknown;
  segments: string[];
}): ExpressionResolution {
  const { root, segments } = args;

  if (segments.length === 0) {
    return { ok: true, value: root };
  }

  let current = root;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (current === null || current === undefined) {
      return {
        ok: false,
        reason: "PATH_NOT_TRAVERSABLE",
        segment,
      };
    }

    if (!isPlainObject(current)) {
      return {
        ok: false,
        reason: "PATH_NOT_TRAVERSABLE",
        segment,
      };
    }

    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return {
        ok: false,
        reason: "PATH_NOT_FOUND",
        segment,
      };
    }

    current = current[segment];
  }

  return { ok: true, value: current };
}
