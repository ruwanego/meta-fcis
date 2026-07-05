# Roadmap

How this roadmap works: each item below is a **candidate OpenSpec change**, in
priority order. Only the top unstarted item gets specced — start it with
`/opsx:propose`, implement with `/opsx:apply`, finish with `/opsx:archive`
(which folds its delta specs into `openspec/specs/`). Items further down are
direction, not commitments; reorder freely. Nothing here may be implemented
without going through a proposed and approved change first (see AGENTS.md 2.1).

Done (baseline, specced in `openspec/specs/`): Milestones 0–10 — core semantic
pipeline through transaction planning, plain shell runtime, in-memory example.
Milestone 11 (`transaction-execution-boundary`) shipped 2026-07-05; archived at
`openspec/changes/archive/2026-07-05-transaction-execution-boundary/`.

Released: `core-v0.1.0` and `shell-v0.1.0` (GitHub releases, 2026-07-05).
npm publish stays deferred per RELEASE.md.

## Next up

1. **graph-loading** (M12)
   Load and validate `app-graph.json` from a caller-supplied object or JSON
   string; enforce `engineCompatibility.min/max` against the engine version
   (currently validated as strings but never checked). Small, core-only.

2. **plugin-persistence-memory** (M13)
   First real plugin package: an in-memory persistence adapter implementing
   selector semantics (where/cardinality/limit/orderBy/onMissing) honestly,
   plus a `TransactionExecutor` backed by the same store — one package, one
   consistent data layer. Replaces the example's fakes with the real plugin.

3. **plugin-transport-http** (M14)
   HTTP transport plugin mapping requests to the shell and `RuntimeError`
   codes/status to HTTP responses. First package allowed to know HTTP; core
   and shell stay transport-free. Moved ahead of schema/auth: with persistence
   (M13) it makes the engine a visibly runnable service, and the existing fake
   schema/auth adapters suffice for a demo.

## Later (order tentative)

4. **plugin-schema** — schema validation plugin wrapping a real validator
   (outside core; core keeps only the adapter interface).
5. **plugin-auth** — auth plugin (e.g. token → actor) behind the auth adapter.
6. **e2e-example** — example app wiring transport + schema + auth +
   persistence + executor plugins end to end. Milestone for a `0.2.0` release
   line across packages.

## Explicit non-goals (unchanged from AGENTS.md)

TypeSpec/codegen, ORMs, framework coupling in core, and anything that gives
core knowledge of HTTP, databases, or plugin internals.
