# Meta-FCIS

Meta-FCIS is a graph-centered, plugin-driven, LLM-safe application engine.

The current repository contains the semantic core, a plain runtime shell scaffold, plugin packages for persistence, schema validation, and HTTP transport, and a basic in-memory example. The core is not a web framework, HTTP server, database layer, or code generator — mechanisms live in plugins.

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
- `loadGraph` entry point with engine compatibility enforcement (Milestone 12)
- typed route `transport` blocks with validated HTTP methods (Milestone 14)
- typed graph model definitions (Milestone 15)

The core builds transaction plans but does not execute transactions.

`@meta-fcis/shell` is complete through Milestone 11:

- accepts a graph supplied by the caller
- accepts runtime adapters supplied by the caller
- delegates route execution to core
- converts core `RuntimeError` failures into shell result objects
- optionally executes the transaction plan through a caller-supplied `TransactionExecutor` (never directly)
- does not serve HTTP, open sockets, load plugins, or connect to databases

`@meta-fcis/plugin-persistence-memory` is complete through Milestone 13:

- first real plugin package (`Config -> Adapter` factory)
- in-memory persistence adapter with full resolved-selector semantics
- atomic transaction executor over the same store; CREATE results report generated ids
- memory only — no files, database, or network

`@meta-fcis/plugin-schema` is complete through Milestone 15:

- model-driven `SchemaAdapter` interpreting the graph's own `models` declarations
- required fields, closed type set, undeclared payload fields rejected
- aggregate errors naming every failing field, surfaced as `REQUEST_VALIDATION_FAILED` (400)
- zero runtime dependencies

`@meta-fcis/plugin-transport-http` is complete through Milestone 14:

- serves a shell runtime over `node:http` (the only package allowed to know HTTP)
- maps HTTP requests to core `Request`s; engine-decided error statuses pass through unchanged
- enforces route-declared `transport.method` (405), rejects malformed JSON (400), contains handler crashes (500)
- never imports the shell — the `runRoute` handler is injected

`@meta-fcis/example-basic` is complete through Milestone 13:

- builds an in-memory graph and loads it through `loadGraph`
- obtains persistence and execution from `@meta-fcis/plugin-persistence-memory`
- provides fake schema/auth/pureInvoker adapters
- invokes the shell runtime
- prints the response payload, transaction plan, and execution result

All work flows through the OpenSpec workflow (`openspec/specs/` is the source of truth; see [AGENTS.md](./AGENTS.md) and [ROADMAP.md](./ROADMAP.md)). The next milestone must go through a proposed change before implementation.

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

packages/plugin-persistence-memory/
packages/plugin-schema/
packages/plugin-transport-http/
  src/          (Config -> Adapter factory)
  scripts/      (smoke.mjs)

examples/basic/
  src/
    index.ts

openspec/
  specs/        (baseline capability specs — source of truth)
  changes/      (active and archived OpenSpec changes)
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
  loadGraph,
  validateGraph,
  validateIntentSet,
  RuntimeError,
  ENGINE_VERSION,
} from "@meta-fcis/core";
```

The shell package entrypoint is:

```ts
import { createShellRuntime } from "@meta-fcis/shell";
```

Plugin entrypoints:

```ts
import { createMemoryPersistence } from "@meta-fcis/plugin-persistence-memory";
import { createModelSchema } from "@meta-fcis/plugin-schema";
import { createHttpTransport } from "@meta-fcis/plugin-transport-http";
```

The published surface is `dist/index.js` and `dist/index.d.ts`.

## Release Notes

This repository and `@meta-fcis/core` are licensed under MIT.

The current release track is package-scoped prereleases for `@meta-fcis/core` and `@meta-fcis/shell`. See [RELEASE.md](./RELEASE.md) for the release process.

No runtime dependencies are allowed in `@meta-fcis/core`.
