# Meta-FCIS

Meta-FCIS is a graph-centered, plugin-driven, LLM-safe application engine.

The current repository contains the semantic core only. It is not a web framework, HTTP server, database layer, plugin package, or code generator.

```txt
app-graph.json = application contract
@meta-fcis/core = semantic microkernel
plugins = mechanisms
pure.ts = deterministic business decision logic
```

## Current Status

`@meta-fcis/core` is complete through Milestone 8:

- protocol and graph types
- adapter interfaces
- `RuntimeError`
- strict `validateGraph`
- `validateIntentSet`
- expression resolution
- dependency selector resolution
- policy evaluation
- intent authorization
- transaction plan building
- `executeRoute` semantic pipeline wiring

The core builds transaction plans but does not execute transactions.

The next semantic milestone must be explicitly requested before implementation.

## Package Boundaries

`@meta-fcis/core` is framework-free and runtime-agnostic.

The core owns:

- graph semantics
- expression semantics
- selector semantics
- policy semantics
- intent authorization semantics
- transaction plan semantics

The core does not own:

- HTTP transport
- authentication implementations
- persistence implementations
- database clients
- plugin internals
- transaction execution
- TypeSpec or client generation

Adapters provide mechanisms. Pure functions provide deterministic domain decisions.

## Repository Layout

```txt
packages/core/
  src/
    adapters/
    errors/
    expressions/
    graph/
    intents/
    pipeline/
    policies/
    protocol/
    selectors/
    transactions/
  scripts/
    smoke.mjs
    expression-smoke.mjs
    selector-smoke.mjs
    policy-smoke.mjs
    intent-smoke.mjs
    transaction-smoke.mjs
    graph-smoke.mjs
```

## Development

Install dependencies:

```sh
pnpm install
```

Build:

```sh
pnpm build
```

Typecheck:

```sh
pnpm typecheck
```

Run all smoke verification:

```sh
pnpm smoke
```

CI runs the same build, typecheck, and smoke checks on `main`.

## Public API

The package entrypoint is:

```ts
import {
  executeRoute,
  validateGraph,
  validateIntentSet,
  RuntimeError,
} from "@meta-fcis/core";
```

The published surface is `dist/index.js` and `dist/index.d.ts`.

## Release Notes

This repository and `@meta-fcis/core` are licensed under MIT.

The current release track is package-scoped prereleases for `@meta-fcis/core`. See [RELEASE.md](./RELEASE.md) for the release process.

No runtime dependencies are allowed in `@meta-fcis/core`.
