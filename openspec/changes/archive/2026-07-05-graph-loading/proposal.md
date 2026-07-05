# Proposal: graph-loading

## Why

`app-graph.json` is the application contract, but the engine has no front door for it: callers must hand `executeRoute`/the shell an already-parsed object, and the graph's `engineCompatibility.min/max` fields are validated as strings yet never enforced against the engine version. A graph authored for a future engine currently runs silently on an incompatible one.

## What Changes

- `@meta-fcis/core` gains `loadGraph(input)`: accepts a parsed object or a JSON string, parses when needed, runs the existing strict `validateGraph`, then enforces `engineCompatibility.min/max` against the engine version. Returns a typed `AppGraph` or throws `RuntimeError`.
- `@meta-fcis/core` gains an `ENGINE_VERSION` constant (kept in sync with the package version by smoke verification — the core cannot read files at runtime).
- `@meta-fcis/core` gains a `GRAPH_INCOMPATIBLE` code in the `RuntimeErrorCode` union for version-range failures (distinct from structural `GRAPH_INVALID`).
- `validateGraph`, `executeRoute`, the shell, and the example are unchanged.

## Capabilities

### New Capabilities

- `graph-loading`: the `loadGraph` entry point — input forms, parse failure handling, delegation to graph validation, and engine compatibility enforcement.

### Modified Capabilities

_None. `graph-validation` stays purely structural; `route-execution` and `shell-runtime` requirements are untouched._

## Impact

- Code: `packages/core/src/graph/loadGraph.ts` (new), `packages/core/src/version.ts` (new), `packages/core/src/errors/RuntimeError.ts` (one union member), `packages/core/src/index.ts` (exports), new `packages/core/scripts/load-smoke.mjs`.
- API: additive only — new exports `loadGraph`, `ENGINE_VERSION`, `GRAPH_INCOMPATIBLE` code. No behavior change for existing callers.
- Dependencies: none. Core keeps zero runtime dependencies (no semver library — a minimal version grammar is defined instead).

## Non-goals

- No enforcement inside `executeRoute` or the shell — `loadGraph` is the caller's front door; the pipeline keeps validating structure only. Wiring compatibility into the pipeline is a future decision.
- No full semver range support (`^`, `~`, `||`, prerelease tags). A minimal grammar covers the contract's actual shape (`0.1.0`, `0.x`).
- No graph file I/O — the core never touches the filesystem; callers read the file and pass the string.
- No frameworks, plugins, HTTP, or databases.
