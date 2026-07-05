import type { AppGraph } from "@meta-fcis/core";

export type Row = Record<string, unknown>;
export type Store = Map<string, Map<string, Row>>;

export interface BuiltStore {
  store: Store;
  idFields: Map<string, string>;
}

export function buildStore(
  graph: AppGraph,
  seed?: Record<string, Row[]>
): BuiltStore {
  const store: Store = new Map();
  const idFields = new Map<string, string>();

  for (const [entityName, entity] of Object.entries(graph.entities)) {
    idFields.set(entityName, entity.idField);
    const table = new Map<string, Row>();

    for (const row of seed?.[entityName] ?? []) {
      const id = row[entity.idField];
      if (typeof id !== "string" || id.length === 0) {
        throw new Error(
          `Seed row for entity '${entityName}' must have a non-empty string '${entity.idField}'`
        );
      }
      table.set(id, { ...row });
    }

    store.set(entityName, table);
  }

  for (const entityName of Object.keys(seed ?? {})) {
    if (!store.has(entityName)) {
      throw new Error(`Seed references unknown entity: '${entityName}'`);
    }
  }

  return { store, idFields };
}
