import type {
  TransactionExecutionResult,
  TransactionOperationResult,
  TransactionPlan,
} from "@meta-fcis/core";
import type { Row, Store } from "./store.js";

export function executePlan(args: {
  store: Store;
  idFields: Map<string, string>;
  idGenerator: () => string;
  plan: TransactionPlan;
}): TransactionExecutionResult {
  const { store, idFields, idGenerator, plan } = args;

  // Operations run against draft copies of the touched tables; the store is
  // swapped only after the whole plan succeeds (all-or-nothing). Rows are
  // never mutated in place, so copying the table Map is a sufficient draft.
  const draft: Store = new Map();
  const tableFor = (entity: string): Map<string, Row> => {
    const existing = draft.get(entity);
    if (existing) {
      return existing;
    }
    const base = store.get(entity);
    if (!base) {
      throw new Error(`Plan operation references unknown entity: '${entity}'`);
    }
    const copy = new Map(base);
    draft.set(entity, copy);
    return copy;
  };

  const operations: TransactionOperationResult[] = [];

  for (const operation of plan.operations) {
    const table = tableFor(operation.entity);

    if (operation.kind === "CREATE") {
      const idField = idFields.get(operation.entity) as string;
      const id = idGenerator();
      table.set(id, { ...operation.payload, [idField]: id });
      operations.push({
        kind: "CREATE",
        entity: operation.entity,
        targetId: id,
        outcome: "applied",
      });
      continue;
    }

    if (operation.kind === "UPDATE") {
      const existing = table.get(operation.targetId);
      if (!existing) {
        throw new Error(
          `UPDATE target not found: '${operation.entity}/${operation.targetId}'`
        );
      }
      table.set(operation.targetId, { ...existing, ...operation.payload });
      operations.push({
        kind: "UPDATE",
        entity: operation.entity,
        targetId: operation.targetId,
        outcome: "applied",
      });
      continue;
    }

    if (!table.delete(operation.targetId)) {
      throw new Error(
        `DELETE target not found: '${operation.entity}/${operation.targetId}'`
      );
    }
    operations.push({
      kind: "DELETE",
      entity: operation.entity,
      targetId: operation.targetId,
      outcome: "applied",
    });
  }

  for (const [entity, table] of draft) {
    store.set(entity, table);
  }

  return { operations };
}
