# @meta-fcis/plugin-persistence-memory

In-memory persistence plugin for Meta-FCIS: one factory returning a
`PersistenceAdapter` (honest resolved-selector semantics) and a
`TransactionExecutor` (atomic plan application) over a shared store.

```ts
import { createMemoryPersistence } from "@meta-fcis/plugin-persistence-memory";

const { persistence, transactionExecutor } = createMemoryPersistence({
  graph,                                   // validated AppGraph
  seed: { Task: [{ id: "task-1", ... }] }, // optional
  idGenerator: () => crypto.randomUUID(),  // optional (this is the default)
});
```

Memory only — no durability. Reference mechanism and test double; database
plugins are separate packages. See `openspec/specs/plugin-persistence-memory/`
for the behavioral contract.
