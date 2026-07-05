# Basic Example Delta

## MODIFIED Requirements

### Requirement: In-memory demonstration

The example SHALL build an in-memory application graph, obtain its persistence adapter and transaction executor from `@meta-fcis/plugin-persistence-memory` (seeded with the demo task), provide fake schema/auth/pureInvoker adapters, invoke the shell runtime, and print the response payload, the transaction plan, and the execution result. Plan application SHALL happen only inside the plugin's executor.

#### Scenario: Example run

- **WHEN** `pnpm --filter @meta-fcis/example-basic start` is run
- **THEN** it prints the route result (payload, transaction plan, and execution result with per-operation `"applied"` outcomes) using no HTTP server or database, and the seeded task ends up completed in the plugin's store

#### Scenario: Plugin is the only persistence mechanism

- **WHEN** the example's code is inspected
- **THEN** it contains no hand-written persistence adapter or executor — both come from the plugin factory

### Requirement: Consumes public APIs only

The example SHALL depend only on `@meta-fcis/shell`, `@meta-fcis/core`, and `@meta-fcis/plugin-persistence-memory` public entrypoints — no deep imports into package internals.

#### Scenario: Public surface only

- **WHEN** the example's imports are inspected
- **THEN** they resolve to `@meta-fcis/*` package roots
