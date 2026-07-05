# Basic Example Specification

## Purpose

`@meta-fcis/example-basic` demonstrates the full stack end-to-end in memory: a hand-built graph, fake adapters, and the shell runtime — proving the engine runs with zero infrastructure.

## Requirements

### Requirement: In-memory demonstration

The example SHALL build an in-memory application graph, provide fake adapters (schema, auth, persistence, pureInvoker), invoke the shell runtime, and print the response payload and transaction plan. It SHALL NOT execute the transaction plan.

#### Scenario: Example run

- **WHEN** `pnpm --filter @meta-fcis/example-basic start` is run
- **THEN** it prints the route result (payload and transaction plan) using no HTTP server, plugins, or database

### Requirement: Consumes public APIs only

The example SHALL depend only on `@meta-fcis/shell` and `@meta-fcis/core` public entrypoints — no deep imports into package internals.

#### Scenario: Public surface only

- **WHEN** the example's imports are inspected
- **THEN** they resolve to `@meta-fcis/shell` / `@meta-fcis/core` package roots
