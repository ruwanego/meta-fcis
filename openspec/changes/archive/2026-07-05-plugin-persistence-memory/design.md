# Design: plugin-persistence-memory

## Context

Core defines `PersistenceAdapter` (`loadDependencies(resolvedSelectors)`) and `TransactionExecutor` (`execute(plan)`), and the shell wires both. Only fakes exist. The plugin model is `Config -> Adapter` factories that may do effects; plugins depend on core, never the reverse. Resolved selectors carry `entity`, equality `where`, `cardinality`, `project`, optional `limit`/`orderBy`, and `onMissing`; plan operations carry `kind`/`entity`/`targetId`/`payload`.

## Goals / Non-Goals

**Goals:**

- One package exporting one factory: graph + optional seed in, `{ persistence, transactionExecutor }` out, both views of the same store.
- Honest selector semantics — every field of `ResolvedDependencySelector` does what the graph author expects.
- Atomic plan application with generated ids surfaced to callers.
- Prove the plugin ergonomics by running `examples/basic` on it.

**Non-Goals:**

- Durability, soft deletes, non-equality queries, concurrency control (single-threaded in-memory store), core/shell changes.

## Decisions

1. **Factory shape: `createMemoryPersistence({ graph, seed?, idGenerator? })` returning `{ persistence, transactionExecutor }`.**
   The graph gives the plugin each entity's `idField` (needed for id generation, `targetId` lookups, and projection safety) without a parallel config format. Seed is `Record<entityName, row[]>`.
   *Alternative considered:* per-entity config (idField map) — rejected; the graph is the contract and already validated.

2. **One store, two adapters.**
   Reads (`loadDependencies`) and writes (`execute`) must observe the same data or the example's read-after-write flow is a lie. The factory closes over a single `Map<entityName, Map<id, row>>`.

3. **Selector evaluation order: filter (equality on all `where` keys, `Object.is`) → sort (`orderBy` keys in order, asc/desc, `<`/`>` on values) → `limit` → project → cardinality/onMissing.**
   `cardinality: "one"` takes the first row after sorting; zero rows triggers `onMissing`: `null` → `null`, `empty` → `[]` for many / `null` for one, `error` → throw (surfaces as `DEPENDENCY_LOAD_FAILED` through the pipeline, which is the specced behavior for adapter throws).
   Unknown entity in a selector → throw (a graph/selector mismatch is a bug, not an empty result).

4. **Executor applies to a draft, then swaps (atomic commit).**
   Operations run against a copied view of the touched tables; the store is swapped only after every operation succeeds. A mid-plan failure (unknown entity, missing `targetId` row) throws — the shell converts it to `TRANSACTION_EXECUTION_FAILED` — and the store is untouched. This closes the M11 "partial execution" risk for this plugin without changing the core contract.

5. **CREATE ids: `idGenerator` config, default `crypto.randomUUID`, generated id reported as `targetId` in the operation result.**
   `TransactionOperationResult.targetId` is already optional — reporting the generated id there gives callers read-your-write ability with zero contract changes. Deterministic tests/smoke pass a counter-based generator. `globalThis.crypto.randomUUID` is a web standard (not Node-specific), fine for a plugin either way.

6. **Rows are plain objects; UPDATE is shallow merge; DELETE removes the row; the store never mutates caller-supplied seed or returns live references** (rows are copied on the way in and out) so pure functions can't accidentally mutate storage through a dependency.

## Risks / Trade-offs

- [Equality-only `where` may under-serve future graphs] → matches what selector resolution emits today; operators would be a core semantics change first, plugin second.
- [Copy-on-read costs] → irrelevant at in-memory example scale; `// ponytail:`-style note in code with the upgrade path (structural sharing) if it ever matters.
- [`onMissing: "error"` throw is indistinguishable from adapter bugs at the shell] → both correctly map to `DEPENDENCY_LOAD_FAILED`; the thrown error message names the selector.

## Migration Plan

Additive package + example swap. Example behavior identical except execution now goes through the plugin. Rollback = revert the example wiring.

## Open Questions

- None blocking.
