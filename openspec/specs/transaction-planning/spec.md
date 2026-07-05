# Transaction Planning Specification

## Purpose

Translate an authorized IntentSet into an ordered transaction plan of CREATE/UPDATE/DELETE operations. Planning only — the core never executes the plan.

## Requirements

### Requirement: Plan construction

`buildTransactionPlan` SHALL map intents, in order, to operations: CREATE → `{ kind, entity, payload }`; UPDATE → `{ kind, entity, targetId, payload }`; DELETE → `{ kind, entity, targetId }`. It SHALL return a discriminated result and never throw.

#### Scenario: Ordered plan from mixed intents

- **WHEN** an IntentSet contains a CREATE followed by an UPDATE
- **THEN** the plan's operations array preserves that order with matching kinds

### Requirement: Operation invariants

Planning SHALL fail (with the failing intent `index`) when: an intent type is not `MUTATE_ENTITY` or its operation is unknown (`TRANSACTION_INTENT_UNSUPPORTED`); CREATE carries a `targetId` or a non-object payload (`TRANSACTION_PAYLOAD_INVALID`); UPDATE lacks a non-empty `targetId` (`TRANSACTION_TARGET_REQUIRED`) or has an empty/non-object payload (`TRANSACTION_PAYLOAD_INVALID`); DELETE lacks a `targetId` (`TRANSACTION_TARGET_REQUIRED`) or has a non-empty payload (`TRANSACTION_PAYLOAD_INVALID`).

#### Scenario: Delete with payload rejected

- **WHEN** a DELETE intent carries a non-empty payload
- **THEN** planning fails with `TRANSACTION_PAYLOAD_INVALID` at that intent's index

### Requirement: No execution

The core SHALL NOT execute transaction plans. `executeRoute` returns the plan to the caller; execution belongs to a future, explicitly requested milestone. A planning failure during route execution SHALL abort with `RuntimeError` code `TRANSACTION_PLANNING_FAILED` (status 500).

#### Scenario: Plan returned, nothing persisted

- **WHEN** `executeRoute` completes successfully
- **THEN** the result contains `transactionPlan` and no adapter is asked to apply it
