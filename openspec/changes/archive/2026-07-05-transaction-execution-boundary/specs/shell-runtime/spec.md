# Shell Runtime Delta

## MODIFIED Requirements

### Requirement: Runtime creation

`createShellRuntime({ graph, adapters, transactionExecutor? })` SHALL return a `ShellRuntime` whose `runRoute(request)` delegates to core `executeRoute` with the configured graph and adapters, and — only when a `transactionExecutor` is configured — passes a successful result's transaction plan to that executor. The shell SHALL NOT validate, own, or mutate the graph itself.

#### Scenario: Delegation to core

- **WHEN** `runRoute` is called with a request
- **THEN** core `executeRoute(graph, request, adapters)` performs all semantics

#### Scenario: Optional executor wiring

- **WHEN** the config includes a `transactionExecutor` and `executeRoute` succeeds
- **THEN** the shell invokes the executor with the returned transaction plan

### Requirement: Result boundary

`runRoute` SHALL never throw. Success returns `{ ok: true, value }` where `value` contains `intentSet`, `transactionPlan`, and — only when an executor is configured and ran — `execution`. A `RuntimeError` from the core returns `{ ok: false, error }` preserving `code`, `message`, `status`, and `details`. A throwing executor returns `{ ok: false, error }` with code `TRANSACTION_EXECUTION_FAILED` and status 500. Any other thrown value returns `{ ok: false, error }` with code `SHELL_INTERNAL_ERROR` and status 500.

#### Scenario: Core error converted

- **WHEN** the core throws `ROUTE_NOT_FOUND`
- **THEN** `runRoute` resolves to `ok: false` with `error.code = "ROUTE_NOT_FOUND"` and `error.status = 404`

#### Scenario: Executor error converted

- **WHEN** the configured executor throws
- **THEN** `runRoute` resolves to `ok: false` with `error.code = "TRANSACTION_EXECUTION_FAILED"` and `error.status = 500`

#### Scenario: Unknown throw converted

- **WHEN** something other than a `RuntimeError` is thrown
- **THEN** `runRoute` resolves to `ok: false` with `error.code = "SHELL_INTERNAL_ERROR"`

### Requirement: Scaffold limits

The shell SHALL NOT serve HTTP, open sockets, load plugins, implement auth providers, or connect to databases. The shell SHALL NOT execute transactions directly; it MAY execute a transaction plan only by delegating to a caller-supplied `TransactionExecutor` adapter. Its only runtime dependency is `@meta-fcis/core`.

#### Scenario: No transport

- **WHEN** the shell package is inspected
- **THEN** it exposes only `createShellRuntime`, `runRoute`, and its types — no server, listener, or plugin loader

#### Scenario: No direct execution

- **WHEN** no `transactionExecutor` is supplied
- **THEN** the shell contains no code path that applies a transaction plan
