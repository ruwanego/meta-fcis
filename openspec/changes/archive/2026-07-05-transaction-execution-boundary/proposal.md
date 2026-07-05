# Proposal: transaction-execution-boundary

## Why

The engine currently stops at planning: `executeRoute` returns a transaction plan that nothing can carry out, so no application built on Meta-FCIS can actually persist anything. Milestone 11 introduces the execution *boundary* — a core-owned adapter contract plus an opt-in shell step — so plans become executable without the core ever gaining execution, database, or I/O knowledge.

## What Changes

- `@meta-fcis/core` gains a `TransactionExecutor` adapter interface (contract only: `execute(plan) -> TransactionExecutionResult`) alongside the existing adapter interfaces. No implementation in core; `executeRoute` is untouched and still returns the plan without executing it.
- `@meta-fcis/core` gains a `TRANSACTION_EXECUTION_FAILED` code in the `RuntimeErrorCode` union.
- `@meta-fcis/shell` gains an opt-in execution step: when (and only when) the caller supplies a `transactionExecutor`, `runRoute` passes the successful plan to it and includes the execution result in the shell result. Without an executor, behavior is byte-for-byte unchanged.
- `@meta-fcis/example-basic` gains a fake in-memory executor demonstrating the full flow and printing the execution result.

## Capabilities

### New Capabilities

- `transaction-execution`: the executor adapter contract, its result shape, and the shell's opt-in execution step semantics (ordering, error conversion, skip behavior).

### Modified Capabilities

- `shell-runtime`: the "Scaffold limits" requirement currently forbids the shell from executing transactions; it is relaxed to "the shell executes only via a caller-supplied executor adapter, never directly". The result boundary gains the execution result field.
- `basic-example`: the "In-memory demonstration" requirement currently forbids executing the plan; it changes to demonstrate execution through the fake in-memory executor.

## Impact

- Code: `packages/core/src/adapters/` (new interface), `packages/core/src/errors/RuntimeError.ts` (new code), `packages/core/src/transactions/` (result types), `packages/shell/src/` (config + runRoute step), `examples/basic/src/index.ts`, smoke scripts for shell and example.
- API: additive only — new optional `transactionExecutor` in `ShellRuntimeConfig`, new exported types from core. No breaking changes; existing callers see identical behavior.
- Dependencies: none added. Core keeps zero runtime dependencies.

## Non-goals

- No transaction execution inside `@meta-fcis/core` — `executeRoute` still never executes; execution stays a mechanism behind an adapter invoked by the shell.
- No real persistence: no database, SQL, ORM, or plugin package. The only executor shipped is the example's in-memory fake.
- No HTTP, sockets, frameworks, or plugin loading in core or shell.
- No rollback/retry/saga semantics — the executor contract reports success or failure per plan; recovery strategies belong to future executor implementations.
