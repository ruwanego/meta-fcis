# Basic Example Delta

## MODIFIED Requirements

### Requirement: In-memory demonstration

The example SHALL build an in-memory application graph, provide fake adapters (schema, auth, persistence, pureInvoker) plus a fake in-memory `TransactionExecutor`, invoke the shell runtime, and print the response payload, the transaction plan, and the execution result. Execution SHALL happen only through the fake executor supplied to the shell — the example SHALL NOT apply the plan itself.

#### Scenario: Example run

- **WHEN** `pnpm --filter @meta-fcis/example-basic start` is run
- **THEN** it prints the route result (payload, transaction plan, and execution result with per-operation `"applied"` outcomes) using no HTTP server, plugins, or database

#### Scenario: Executor is the only applier

- **WHEN** the example's code is inspected
- **THEN** plan application happens only inside the fake executor passed via `ShellRuntimeConfig.transactionExecutor`
