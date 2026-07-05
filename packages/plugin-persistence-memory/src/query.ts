import type { ResolvedDependencySelector } from "@meta-fcis/core";
import type { Row, Store } from "./store.js";

function compareValues(a: unknown, b: unknown): number {
  if (Object.is(a, b)) {
    return 0;
  }
  // ponytail: relational compare on raw values; per-type collation if graphs ever need it
  return (a as never) < (b as never) ? -1 : 1;
}

function project(row: Row, fields: string[]): Row {
  const projected: Row = {};
  for (const field of fields) {
    if (field in row) {
      projected[field] = row[field];
    }
  }
  return projected;
}

function missing(name: string, selector: ResolvedDependencySelector): unknown {
  if (selector.onMissing === "error") {
    throw new Error(
      `Selector '${name}' matched no rows for entity '${selector.entity}'`
    );
  }
  if (selector.onMissing === "empty") {
    return selector.cardinality === "many" ? [] : null;
  }
  return null;
}

export function runSelector(
  store: Store,
  name: string,
  selector: ResolvedDependencySelector
): unknown {
  const table = store.get(selector.entity);
  if (!table) {
    throw new Error(
      `Selector '${name}' references unknown entity: '${selector.entity}'`
    );
  }

  let rows = [...table.values()].filter((row) =>
    Object.entries(selector.where).every(([field, value]) => Object.is(row[field], value))
  );

  const orderBy = selector.orderBy ?? [];
  if (orderBy.length > 0) {
    rows = [...rows].sort((a, b) => {
      for (const { field, direction } of orderBy) {
        const order = compareValues(a[field], b[field]);
        if (order !== 0) {
          return direction === "desc" ? -order : order;
        }
      }
      return 0;
    });
  }

  if (selector.limit !== undefined) {
    rows = rows.slice(0, selector.limit);
  }

  const projected = rows.map((row) => project(row, selector.project));

  if (projected.length === 0) {
    return missing(name, selector);
  }

  return selector.cardinality === "many" ? projected : projected[0];
}
