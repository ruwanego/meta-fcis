import {
  ResolveDependencySelectorsArgs,
  ResolvedDependencySelector,
  SelectorResolutionResult,
} from "./types.js";
import { resolveDependencySelector } from "./resolveDependencySelector.js";

export function resolveDependencySelectors(
  args: ResolveDependencySelectorsArgs
): SelectorResolutionResult<Record<string, ResolvedDependencySelector>> {
  const { selectors, scope } = args;

  const resolved: Record<string, ResolvedDependencySelector> = {};

  for (const alias of Object.keys(selectors)) {
    if (alias === "") {
      return {
        ok: false,
        error: {
          reason: "SELECTOR_FIELD_INVALID",
          field: alias,
        },
      };
    }

    if (!Object.prototype.hasOwnProperty.call(selectors, alias)) {
      continue;
    }

    const selector = selectors[alias];

    const resolution = resolveDependencySelector({
      selector,
      scope,
    });

    if (!resolution.ok) {
      return {
        ok: false,
        error: {
          reason: resolution.error.reason,
          field: resolution.error.field,
          details: {
            alias,
            originalError: resolution.error,
          },
        },
      };
    }

    resolved[alias] = resolution.value;
  }

  return {
    ok: true,
    value: resolved,
  };
}
