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

## Immediate next steps (process, not milestones)

- [ ] Merge `feat/m11-transaction-execution` into `main` via PR; CI runs
      build + typecheck + smoke on the PR.
- [ ] After merge: re-run `gitnexus analyze` on `main` (it will regenerate
      `CLAUDE.md` — delete it; AGENTS.md carries the same block).
- [ ] Optional: first prereleases per RELEASE.md — both packages are at
      `0.1.0 - Unreleased`; date the CHANGELOG entry, tag `core-v0.1.0` and
      `shell-v0.1.0`. npm publish stays deferred.

## Next up

1. **graph-loading** (M12)
   Load and validate `app-graph.json` from a caller-supplied object or string;
   engine compatibility (`engineCompatibility.min/max`) enforcement.

## Later (order tentative)

2. **plugin-persistence-memory** — first real plugin package: in-memory
   persistence adapter implementing selector semantics (where/cardinality/
   limit/orderBy/onMissing) honestly.
3. **plugin-schema** — schema validation plugin wrapping a real validator
   (outside core; core keeps only the adapter interface).
4. **plugin-auth** — auth plugin (e.g. token → actor) behind the auth adapter.
5. **plugin-transport-http** — HTTP transport plugin that maps requests to the
   shell and `RuntimeError` codes/status to HTTP responses. First package
   allowed to know HTTP; core and shell stay transport-free.
6. **e2e-example** — example app wiring transport + schema + auth +
   persistence + executor plugins end to end.

## Explicit non-goals (unchanged from AGENTS.md)

TypeSpec/codegen, ORMs, framework coupling in core, and anything that gives
core knowledge of HTTP, databases, or plugin internals.
