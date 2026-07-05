# Transaction Execution Specification

## Purpose

Define the boundary through which transaction plans become real effects: a core-owned executor adapter contract and the shell's opt-in execution step. The core defines what an executor *is* but never invokes one — execution is a mechanism owned by callers.

## Requirements

### Requirement: Executor adapter contract

The core SHALL define a `TransactionExecutor` adapter interface with a single method `execute(plan: TransactionPlan): Promise<TransactionExecutionResult>`. The core SHALL NOT ship any executor implementation and SHALL NOT invoke the executor from `executeRoute`; execution is a mechanism owned by callers (shell, future plugins).

#### Scenario: Contract exported, never invoked by core

- **WHEN** the core public API is inspected
- **THEN** `TransactionExecutor` and `TransactionExecutionResult` types are exported, and no core pipeline code path calls `execute`

### Requirement: Execution result shape

`TransactionExecutionResult` SHALL contain an `operations` array with one entry per plan operation, in plan order, each carrying the operation's `kind`, `entity`, `targetId` when applicable, and an `outcome` of `"applied"`.

#### Scenario: Result mirrors plan order

- **WHEN** an executor executes a plan with a CREATE followed by an UPDATE
- **THEN** the result's `operations` array has two entries in that order, each with `outcome: "applied"`

### Requirement: Opt-in shell execution step

The shell SHALL accept an optional `transactionExecutor` in `ShellRuntimeConfig`. When present, `runRoute` SHALL pass the transaction plan from a successful `executeRoute` to the executor and include the executor's result as `execution` in the success value: `{ ok: true, value: { intentSet, transactionPlan, execution } }`. When absent, `runRoute` SHALL behave exactly as before and the success value SHALL contain no `execution` field.

#### Scenario: Executor configured

- **WHEN** a shell runtime is created with a `transactionExecutor` and `runRoute` succeeds
- **THEN** the result value contains `execution` with per-operation outcomes

#### Scenario: No executor configured

- **WHEN** a shell runtime is created without a `transactionExecutor`
- **THEN** `runRoute` results are identical to pre-M11 behavior, with no `execution` field and no executor invocation

#### Scenario: Pipeline failure skips execution

- **WHEN** `executeRoute` throws any `RuntimeError`
- **THEN** the executor is not invoked

### Requirement: Execution failure conversion

A throwing or rejecting executor SHALL be converted at the shell boundary to `{ ok: false, error }` with code `TRANSACTION_EXECUTION_FAILED` and status 500. The error `details` SHALL include the transaction plan and the underlying cause. `runRoute` SHALL still never throw. The core SHALL include `TRANSACTION_EXECUTION_FAILED` in the `RuntimeErrorCode` union.

#### Scenario: Executor throws

- **WHEN** the configured executor rejects while executing a plan
- **THEN** `runRoute` resolves to `ok: false` with `error.code = "TRANSACTION_EXECUTION_FAILED"`, `error.status = 500`, and `error.details` carrying the plan and cause
