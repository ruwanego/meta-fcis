# Roadmap

How this roadmap works: each item below is a **candidate OpenSpec change**, in
priority order. Only the top unstarted item gets specced — start it with
`/opsx:propose`, implement with `/opsx:apply`, finish with `/opsx:archive`
(which folds its delta specs into `openspec/specs/`). Items further down are
direction, not commitments; reorder freely. Nothing here may be implemented
without going through a proposed and approved change first (see AGENTS.md 2.1).

Done (baseline, specced in `openspec/specs/`): Milestones 0–10 — core semantic
pipeline through transaction planning, plain shell runtime, in-memory example.

## Next up

1. **transaction-execution-boundary** (M11)
   Core-owned `TransactionExecutor` adapter interface; shell gains an opt-in
   step that hands the plan to the executor. Core still never executes —
   execution is a mechanism behind an adapter. Example gets an in-memory executor.

2. **graph-loading** (M12)
   Load and validate `app-graph.json` from a caller-supplied object or string;
   engine compatibility (`engineCompatibility.min/max`) enforcement.

## Later (order tentative)

3. **plugin-persistence-memory** — first real plugin package: in-memory
   persistence adapter implementing selector semantics (where/cardinality/
   limit/orderBy/onMissing) honestly.
4. **plugin-schema** — schema validation plugin wrapping a real validator
   (outside core; core keeps only the adapter interface).
5. **plugin-auth** — auth plugin (e.g. token → actor) behind the auth adapter.
6. **plugin-transport-http** — HTTP transport plugin that maps requests to the
   shell and `RuntimeError` codes/status to HTTP responses. First package
   allowed to know HTTP; core and shell stay transport-free.
7. **e2e-example** — example app wiring transport + schema + auth +
   persistence + executor plugins end to end.

## Explicit non-goals (unchanged from AGENTS.md)

TypeSpec/codegen, ORMs, framework coupling in core, and anything that gives
core knowledge of HTTP, databases, or plugin internals.
