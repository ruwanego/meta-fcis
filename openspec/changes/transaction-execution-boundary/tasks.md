# Tasks: transaction-execution-boundary

## 1. Core contracts

- [x] 1.1 Add `TransactionExecutionResult` and `TransactionOperationResult` types (per-operation `kind`, `entity`, optional `targetId`, `outcome: "applied"`) in `packages/core/src/transactions/types.ts`
- [x] 1.2 Add `TransactionExecutor` interface (`execute(plan) => Promise<TransactionExecutionResult>`) in `packages/core/src/adapters/types.ts`; do NOT add it to `RuntimeAdapters`
- [x] 1.3 Add `TRANSACTION_EXECUTION_FAILED` to the `RuntimeErrorCode` union in `packages/core/src/errors/RuntimeError.ts`
- [x] 1.4 Export the new types from `packages/core/src/index.ts`; verify `executeRoute` untouched; `pnpm build && pnpm typecheck`

## 2. Shell execution step

- [x] 2.1 Add optional `transactionExecutor` to `ShellRuntimeConfig` and optional `execution` to the success value type in `packages/shell/src/types.ts`
- [x] 2.2 In `runRoute`, after a successful `executeRoute`, invoke the executor when configured and include its result as `execution`; omit the field and skip invocation when not configured
- [x] 2.3 Convert executor throws/rejections to `ok: false` with `TRANSACTION_EXECUTION_FAILED`, status 500, details carrying plan and cause; never invoke the executor when `executeRoute` failed
- [x] 2.4 Extend `packages/shell/scripts/smoke.mjs`: with-executor success (execution present, plan order mirrored), without-executor (no `execution` field), executor-throws (error code/status), pipeline-failure (executor not invoked)

## 3. Example

- [x] 3.1 Add a fake in-memory `TransactionExecutor` to `examples/basic/src/index.ts` applying operations to an in-memory store and returning per-operation `"applied"` outcomes
- [x] 3.2 Pass the executor via `ShellRuntimeConfig`; print payload, transaction plan, and execution result
- [x] 3.3 Update `examples/basic` smoke script to assert the execution result is present and correct

## 4. Verification and docs

- [x] 4.1 `pnpm build && pnpm typecheck && pnpm smoke` all green
- [x] 4.2 Update README.md and AGENTS.md status sections (Milestone 11: transaction execution boundary; core still never executes)
- [x] 4.3 `openspec validate --all`; run gitnexus `detect_changes` before committing; commit in small conventional commits (`feat(core): ...`, `feat(shell): ...`, `feat(example): ...`, `docs: ...`)
