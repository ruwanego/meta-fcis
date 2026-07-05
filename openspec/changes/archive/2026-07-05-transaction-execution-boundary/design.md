# Design: transaction-execution-boundary

## Context

`executeRoute` (core) produces a validated `TransactionPlan` and stops — by design, per the `transaction-planning` spec's "No execution" requirement. The shell (`runRoute`) converts core outcomes into result objects and is currently forbidden from executing anything. The example prints the plan and exits. Nothing in the system can apply a plan.

Constraints that shape this design: core has zero runtime dependencies and must never gain I/O; dependency direction is shell → core; the core owns adapter *contracts* while mechanisms live outside; all existing behavior must remain unchanged for callers that don't opt in.

## Goals / Non-Goals

**Goals:**

- A core-owned `TransactionExecutor` contract so any future mechanism (in-memory, SQL plugin, queue) implements one interface.
- An opt-in shell step that executes the plan after a successful `executeRoute`.
- Full backward compatibility: no executor configured → identical behavior and result shapes remain valid.
- An end-to-end demonstration in `examples/basic` with a fake in-memory executor.

**Non-Goals:**

- Execution inside core's pipeline; `executeRoute` signature and behavior unchanged.
- Real persistence, plugins, HTTP, rollback/saga/retry semantics.
- Changing `RuntimeAdapters` (the pipeline's adapter set) — the executor is a shell-level concern.

## Decisions

1. **Executor interface lives in core, execution step lives in the shell.**
   Core defines meanings — including what an executor *is* (`execute(plan: TransactionPlan) -> Promise<TransactionExecutionResult>`) — placed in `packages/core/src/adapters/` next to the other adapter interfaces. But the executor is NOT added to `RuntimeAdapters`: `executeRoute`'s contract is "semantics through planning", and adding it there would put execution in the pipeline's reach. The shell orchestrates the plan → executor handoff.
   *Alternative considered:* adding `transactionExecutor` to `RuntimeAdapters` with `executeRoute` calling it — rejected because it violates the "core never executes" invariant and the baseline `route-execution` spec.

2. **Opt-in via `ShellRuntimeConfig.transactionExecutor?`.**
   Absent → `runRoute` behaves exactly as today (result has no execution field). Present → after a successful `executeRoute`, the shell calls the executor with the plan.
   *Alternative considered:* a separate `runAndExecuteRoute` entrypoint — rejected as API surface growth; config-driven keeps one entrypoint.

3. **Execution result shape: per-operation outcomes, core-owned type.**
   `TransactionExecutionResult = { operations: TransactionOperationResult[] }` where each entry mirrors the plan's operation order (`kind`, `entity`, optional `targetId`/`id`, `outcome`). Types live in `packages/core/src/transactions/` because the result's meaning derives from the plan's semantics.
   *Alternative considered:* opaque `unknown` result — rejected; LLM-safety of the engine depends on typed contracts.

4. **Error mapping: `TRANSACTION_EXECUTION_FAILED`.**
   A throwing executor is converted by the shell to `ok: false` with code `TRANSACTION_EXECUTION_FAILED` (status 500), consistent with the existing `RuntimeError`-to-`ShellError` boundary. The code is added to the core `RuntimeErrorCode` union so transports can map it later. Execution failures after a successful pipeline do NOT hide the plan: the error's `details` carry the plan and the underlying cause.

5. **Success result shape: extend `ShellRouteResult` value with optional `execution`.**
   `{ ok: true, value: { intentSet, transactionPlan, execution? } }` — additive, so existing consumers (and the baseline `shell-runtime` spec's success scenario) stay valid.

## Risks / Trade-offs

- [Shell now has two behaviors behind one flag] → Spec scenarios cover both branches explicitly; smoke script exercises with-executor and without-executor paths.
- [Executor contract may prove too thin for real persistence plugins (transactions/rollback)] → Contract is versionable behind the core; the non-goal is documented and the result type leaves room for richer outcomes per operation.
- [Partial execution (op 2 of 3 fails) is representable only as a thrown failure] → Acceptable for M11; per-operation outcomes exist in the result type, and richer partial-failure semantics are explicitly deferred.

## Migration Plan

Additive change; no migration. Rollback = remove the executor from shell config. Archive step syncs delta specs into `openspec/specs/` (`transaction-execution` new; `shell-runtime`, `basic-example` modified).

## Open Questions

- None blocking. Naming of the per-operation `outcome` values (`"applied"` vs `"ok"`) is settled in the delta spec as `"applied"`.
