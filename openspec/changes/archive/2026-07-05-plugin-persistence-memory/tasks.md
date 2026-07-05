# Tasks: plugin-persistence-memory

## 1. Package scaffold

- [x] 1.1 Create `packages/plugin-persistence-memory/` with package.json (`@meta-fcis/plugin-persistence-memory`, version 0.1.0, dependency `@meta-fcis/core: workspace:*`, build/typecheck/smoke scripts), tsconfig extending the base, LICENSE, and a short README

## 2. Implementation

- [x] 2.1 Implement the store in `src/store.ts`: `Map<entityName, Map<id, row>>` built from graph entities + seed; rows copied on the way in and out
- [x] 2.2 Implement `src/query.ts`: selector evaluation — equality `where` (`Object.is`), multi-key `orderBy` asc/desc, `limit`, `project`, cardinality + `onMissing` (null/empty/error), unknown entity throws
- [x] 2.3 Implement `src/execute.ts`: draft-copy of touched tables, CREATE with `idGenerator` (default `crypto.randomUUID`) at the entity's `idField`, UPDATE shallow merge, DELETE remove, missing row/unknown entity throws, swap on success, CREATE results carry generated id as `targetId`
- [x] 2.4 Implement `src/index.ts`: `createMemoryPersistence({ graph, seed?, idGenerator? })` returning `{ persistence, transactionExecutor }` over one store; export config/result types

## 3. Smoke verification

- [x] 3.1 Add `scripts/smoke.mjs` covering: seeded selector load; filter/sort/limit/project combined; `onMissing` null/empty/error; no-live-references; CREATE with generated id readable back; UPDATE merge; DELETE; UPDATE missing row throws; mid-plan failure leaves store untouched (atomicity); full shell round-trip using the plugin (route load → plan → execute)
- [x] 3.2 Wire the package smoke into the root `smoke` script

## 4. Example swap

- [x] 4.1 Replace the fake persistence adapter and executor in `examples/basic/src/index.ts` with `createMemoryPersistence` seeded with the demo task; add the workspace dependency; keep self-check asserts (task completed in plugin store)

## 5. Verification and docs

- [x] 5.1 `pnpm build && pnpm typecheck && pnpm smoke` all green; `openspec validate --all`
- [x] 5.2 Update AGENTS.md workspace section (add the plugin package), README (status + package list), CHANGELOG Unreleased
- [x] 5.3 gitnexus `detect_changes`; small conventional commits on `feat/m13-plugin-persistence-memory` (no trailers)
