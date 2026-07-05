import type {
  AppGraph,
  PersistenceAdapter,
  ResolvedDependencySelector,
  TransactionExecutor,
} from "@meta-fcis/core";
import { buildStore } from "./store.js";
import { runSelector } from "./query.js";
import { executePlan } from "./execute.js";

// Web-standard global; typed here because the core tsconfig pulls in no DOM/Node libs.
declare const crypto: { randomUUID(): string };

export interface MemoryPersistenceConfig {
  graph: AppGraph;
  seed?: Record<string, Record<string, unknown>[]>;
  idGenerator?: () => string;
}

export interface MemoryPersistence {
  persistence: PersistenceAdapter;
  transactionExecutor: TransactionExecutor;
}

export function createMemoryPersistence(
  config: MemoryPersistenceConfig
): MemoryPersistence {
  const { store, idFields } = buildStore(config.graph, config.seed);
  const idGenerator = config.idGenerator ?? (() => crypto.randomUUID());

  return {
    persistence: {
      loadDependencies(selectors: Record<string, ResolvedDependencySelector>) {
        const dependencies: Record<string, unknown> = {};
        for (const [name, selector] of Object.entries(selectors)) {
          dependencies[name] = runSelector(store, name, selector);
        }
        return dependencies;
      },
    },
    transactionExecutor: {
      execute(plan) {
        return executePlan({ store, idFields, idGenerator, plan });
      },
    },
  };
}
