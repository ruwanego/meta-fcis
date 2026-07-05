# Tasks: graph-loading

## 1. Core implementation

- [x] 1.1 Add `packages/core/src/version.ts` exporting `ENGINE_VERSION = "0.1.0"`
- [x] 1.2 Add `GRAPH_INCOMPATIBLE` to the `RuntimeErrorCode` union in `packages/core/src/errors/RuntimeError.ts`
- [x] 1.3 Add `packages/core/src/graph/loadGraph.ts`: string input → `JSON.parse` (parse failure → `GRAPH_INVALID` with parse error in details) → `validateGraph` → engine compatibility check
- [x] 1.4 Implement the version grammar in `loadGraph.ts`: parse `X.Y.Z` triples; `min` plain version with engine ≥ min; `max` plain version (engine ≤ max) or `X.x`/`X.Y.x` wildcard (prefix match); malformed → `GRAPH_INVALID` with path; out of range → `GRAPH_INCOMPATIBLE` with `engineVersion`/`min`/`max` details
- [x] 1.5 Export `loadGraph` and `ENGINE_VERSION` from `packages/core/src/index.ts`; `pnpm build && pnpm typecheck`

## 2. Smoke verification

- [x] 2.1 Add `packages/core/scripts/load-smoke.mjs` covering: object input, JSON string input, malformed JSON → `GRAPH_INVALID`, structural failure delegated, compatible range accepted, min above engine → `GRAPH_INCOMPATIBLE`, wildcard max exceeded → `GRAPH_INCOMPATIBLE`, malformed min → `GRAPH_INVALID`, and `ENGINE_VERSION === package.json version`
- [x] 2.2 Wire `smoke:load` into `packages/core/package.json` and the root `smoke` script

## 3. Verification and docs

- [x] 3.1 `pnpm build && pnpm typecheck && pnpm smoke` all green; `openspec validate --all`
- [x] 3.2 Update README.md and AGENTS.md status sections (Milestone 12: graph loading and engine compatibility); add CHANGELOG entry under a new Unreleased section
- [x] 3.3 gitnexus `detect_changes`; commit in small conventional commits on a `feat/m12-graph-loading` branch
