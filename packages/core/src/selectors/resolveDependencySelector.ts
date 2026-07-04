import {
  ResolveDependencySelectorArgs,
  ResolvedDependencySelector,
  SelectorResolutionResult,
} from "./types.js";
import { resolveSelectorWhere } from "./resolveSelectorWhere.js";

export function resolveDependencySelector(
  args: ResolveDependencySelectorArgs
): SelectorResolutionResult<ResolvedDependencySelector> {
  const { selector, scope } = args;

  const whereResolution = resolveSelectorWhere({
    where: selector.where,
    scope,
  });

  if (!whereResolution.ok) {
    return whereResolution;
  }

  const result: ResolvedDependencySelector = {
    entity: selector.entity,
    cardinality: selector.cardinality,
    where: whereResolution.value,
    project: selector.project,
    onMissing: selector.onMissing,
  };

  if (selector.limit !== undefined) {
    result.limit = selector.limit;
  }

  if (selector.orderBy !== undefined) {
    result.orderBy = selector.orderBy;
  }

  return {
    ok: true,
    value: result,
  };
}
