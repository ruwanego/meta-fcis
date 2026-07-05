# Changelog

All notable changes to this repository will be documented in this file.

Releases are package-scoped. See [RELEASE.md](./RELEASE.md).

## Unreleased

### Added

- `@meta-fcis/plugin-auth`: token-registry authentication plugin — bearer tokens resolved to actors, required/optional route semantics with an anonymous actor, role enforcement; failures surface as `AUTHENTICATION_FAILED` (401) while route policies keep owning 403.

- `@meta-fcis/plugin-schema`: model-driven schema validation plugin — interprets graph `models` (required fields, closed type set, undeclared fields rejected, aggregate error messages) with zero runtime dependencies; failures surface as `REQUEST_VALIDATION_FAILED` (400).
- `AppGraph.models` is now typed (`ModelDefinition` / `ModelFieldDefinition`); typing only, validation unchanged.

- `@meta-fcis/plugin-transport-http`: HTTP transport plugin over `node:http` — maps HTTP requests to core `Request`s, passes engine error statuses through, enforces route `transport.method` (405 `METHOD_NOT_ALLOWED`), rejects malformed JSON (400 `REQUEST_MALFORMED`), and contains handler crashes (500 `TRANSPORT_INTERNAL_ERROR`).
- Route `transport` block is now typed in `AppGraph` (`RouteDefinition.transport`) and `transport.method` is validated against the closed set `GET | POST | PUT | PATCH | DELETE`.
- `@meta-fcis/plugin-persistence-memory`: first real plugin package — in-memory persistence adapter with full resolved-selector semantics (where/orderBy/limit/project/cardinality/onMissing) and an atomic `TransactionExecutor` over the same store; CREATE results report generated ids.
- `examples/basic` now runs on the plugin (and `loadGraph`) instead of hand-written persistence/executor fakes.

- `loadGraph(input)` in `@meta-fcis/core`: accepts a graph object or JSON string, validates it, and enforces `engineCompatibility.min/max` against the engine version.
- `ENGINE_VERSION` constant, smoke-verified against the core package version.
- `GRAPH_INCOMPATIBLE` runtime error code for engine version range failures.

## 0.1.0 - 2026-07-05

### Added

- pnpm workspace scaffold.
- `@meta-fcis/core` package scaffold.
- Protocol, graph, adapter, and runtime error contracts.
- Strict graph validation.
- IntentSet validation.
- Expression resolver.
- Dependency selector resolver.
- Policy evaluator.
- Intent authorization.
- Transaction plan builder.
- `executeRoute` semantic pipeline wiring.
- Core smoke verification scripts.
- GitHub Actions CI for build, typecheck, and smoke verification.
- `@meta-fcis/shell` plain runtime shell scaffold.
- Basic in-memory example using `@meta-fcis/shell`.
- `TransactionExecutor` adapter contract and execution result types in core (contract only; the core pipeline never executes).
- `TRANSACTION_EXECUTION_FAILED` runtime error code.
- Opt-in shell transaction execution through a caller-supplied executor.
- Fake in-memory transaction executor in the basic example.
- OpenSpec spec-driven workflow with baseline specs in `openspec/specs/`.

### Changed

- Aligned graph route dependencies around dependency selectors.
- Persistence adapters now receive resolved dependency selectors.
- Request expression scope includes payload, params, and query.
- Actor custom data is represented through `actor.properties`.

### Notes

- The core does not execute transactions; the shell executes only via a caller-supplied `TransactionExecutor`.
- The core has no runtime dependencies.
- Future semantic milestones require explicit request before implementation.
