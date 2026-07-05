# Design: graph-loading

## Context

`validateGraph` strictly validates structure, including that `engineCompatibility.min/max` are non-empty strings — but nothing interprets them. There is also no supported way to go from graph JSON text to a validated `AppGraph`. Constraints: core has zero runtime dependencies, no Node-specific APIs (so no `fs`, no reading its own `package.json` at runtime), and `validateGraph`/`executeRoute` behavior must not change.

## Goals / Non-Goals

**Goals:**

- One core entry point (`loadGraph`) that takes what callers actually have — an object or JSON text — and returns a validated, compatibility-checked `AppGraph`.
- Enforce `engineCompatibility` with a deliberately small version grammar and a distinct error code.
- Zero new dependencies; existing callers completely unaffected.

**Non-Goals:**

- Compatibility enforcement inside `executeRoute`/shell (documented decision below).
- Full semver ranges, file I/O, graph authoring or generation.

## Decisions

1. **`loadGraph` is a separate front door; `validateGraph` stays structural.**
   Compatibility is environmental ("does this graph fit *this* engine"), not structural ("is this a graph"). Folding it into `validateGraph` would make `executeRoute` — which calls `validateGraph` per request — re-check an environment fact per request and would change the `graph-validation` baseline spec for no caller benefit.
   *Alternative considered:* enforcing in `validateGraph` so the pipeline also rejects incompatible graphs — rejected for scope creep on a baseline spec; revisit when transport plugins load graphs at startup.

2. **`ENGINE_VERSION` is a source constant in `packages/core/src/version.ts`, verified by smoke.**
   The core cannot read `package.json` at runtime (no Node APIs allowed). The smoke script (which runs under Node and may read files) asserts `ENGINE_VERSION === package.json version`, so drift fails CI.
   *Alternative considered:* build-time codegen from package.json — rejected; code generation is forbidden in core and a one-line constant plus a smoke assert is enough.

3. **Minimal version grammar, no semver dependency.**
   - Version: `X.Y.Z` (non-negative integers).
   - `min`: must be a plain version; satisfied when engine ≥ min (numeric triple comparison).
   - `max`: a plain version (engine ≤ max) or a wildcard `X.x` / `X.Y.x` (engine major — or major.minor — must equal the prefix, i.e. an upper bound of "anything in this line").
   - Malformed `min`/`max` is a graph contract violation → `GRAPH_INVALID` (with `details.path`), consistent with all other malformed-graph failures.
   *Alternative considered:* vendoring a semver parser — rejected; the contract's real-world values are `0.1.0` and `0.x`, and the grammar can grow behind the same function.

4. **Distinct `GRAPH_INCOMPATIBLE` error code (status 500).**
   An incompatible graph is not malformed; conflating it with `GRAPH_INVALID` would hide the one failure operators fix by upgrading the engine rather than fixing the graph. Details carry `engineVersion`, `min`, and `max`.

5. **Input handling: object passes through, string is `JSON.parse`d.**
   A parse failure throws `GRAPH_INVALID` with the parse error in details (the text is not a graph). Non-string, non-object inputs fall through to `validateGraph`, which already rejects them.

## Risks / Trade-offs

- [ENGINE_VERSION can drift from package.json] → smoke assert makes drift a CI failure; release checklist already runs smoke.
- [Wildcard-only upper bounds may surprise authors expecting full ranges] → grammar documented in the spec; malformed ranges fail loudly with the offending path.
- [Compatibility not enforced on the request path] → deliberate (Decision 1); the loader is the documented front door, and transport plugins (M14) will call it at startup.

## Migration Plan

Additive; no migration. Existing graphs (`min: "0.1.0"`, `max: "0.x"`) are compatible with engine `0.1.0` by construction.

## Open Questions

- None blocking.
