# Meta-FCIS

Meta-FCIS is a graph-centered, plugin-driven, LLM-safe application engine.

The current repository contains the semantic core, a plain runtime shell scaffold, and a basic in-memory example. It is not a web framework, HTTP server, database layer, plugin package, or code generator.

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
- `TransactionExecutor` adapter contract (Milestone 11; contract only, never invoked by core)

The core builds transaction plans but does not execute transactions.

`@meta-fcis/shell` is complete through Milestone 11:

- accepts a graph supplied by the caller
- accepts runtime adapters supplied by the caller
- delegates route execution to core
- converts core `RuntimeError` failures into shell result objects
- optionally executes the transaction plan through a caller-supplied `TransactionExecutor` (never directly)
- does not serve HTTP, open sockets, load plugins, or connect to databases

`@meta-fcis/example-basic` is complete through Milestone 11:

- builds an in-memory graph
- provides fake adapters and a fake in-memory transaction executor
- invokes the shell runtime
- prints the response payload, transaction plan, and execution result

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

packages/shell/
  src/
    createShellRuntime.ts
    index.ts
    types.ts
  scripts/
    smoke.mjs

examples/basic/
  src/
    index.ts
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

Run the basic example:

```sh
pnpm --filter @meta-fcis/example-basic start
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

The shell package entrypoint is:

```ts
import { createShellRuntime } from "@meta-fcis/shell";
```

The published surface is `dist/index.js` and `dist/index.d.ts`.

## Release Notes

This repository and `@meta-fcis/core` are licensed under MIT.

The current release track is package-scoped prereleases for `@meta-fcis/core` and `@meta-fcis/shell`. See [RELEASE.md](./RELEASE.md) for the release process.

No runtime dependencies are allowed in `@meta-fcis/core`.
