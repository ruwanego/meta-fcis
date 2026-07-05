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

Milestone 12 (`graph-loading`) shipped 2026-07-05; archived at
`openspec/changes/archive/2026-07-05-graph-loading/`.
Milestone 13 (`plugin-persistence-memory`) shipped 2026-07-05; archived at
`openspec/changes/archive/2026-07-05-plugin-persistence-memory/`.
Milestone 14 (`plugin-transport-http`) shipped 2026-07-05; archived at
`openspec/changes/archive/2026-07-05-plugin-transport-http/`. The engine is
now curl-able; route `transport.method` is typed and enforced at the edge.
Milestone 15 (`plugin-schema`) shipped 2026-07-05; archived at
`openspec/changes/archive/2026-07-05-plugin-schema/`. Graph models are the
schema language — zero-dep interpreter, no external validator.

## Next up

1. **plugin-auth** (M16) — auth plugin (e.g. token → actor) behind the auth
   adapter.

## Later (order tentative)

2. **e2e-example** — example app wiring transport + schema + auth +
   persistence + executor plugins end to end. Milestone for a `0.2.0` release
   line across packages.

## Explicit non-goals (unchanged from AGENTS.md)

TypeSpec/codegen, ORMs, framework coupling in core, and anything that gives
core knowledge of HTTP, databases, or plugin internals.
