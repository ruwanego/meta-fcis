# Changelog

All notable changes to this repository will be documented in this file.

This project does not have a public release process yet.

## 0.1.0 - Unreleased

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

### Changed

- Aligned graph route dependencies around dependency selectors.
- Persistence adapters now receive resolved dependency selectors.
- Request expression scope includes payload, params, and query.
- Actor custom data is represented through `actor.properties`.

### Notes

- The core does not execute transactions.
- The core has no runtime dependencies.
- Future semantic milestones require explicit request before implementation.
