# Changelog

All notable changes to this repository will be documented in this file.

Releases are package-scoped. See [RELEASE.md](./RELEASE.md).

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
