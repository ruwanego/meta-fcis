# Intent Authorization Specification

## Purpose

Authorize every intent a pure function emits against the graph's entity definitions and the route's `allowedIntents` declaration. The pure function proposes; the graph disposes.

## Requirements

### Requirement: IntentSet shape validation

`validateIntentSet` SHALL require a plain object with boolean `success`, integer `httpStatus` in 100–599, plain-object `responsePayload`, and an `intents` array where every intent has `type: "MUTATE_ENTITY"`, plain-object `meta` with non-empty `entityName` and `operation` in `CREATE | UPDATE | DELETE` (optional string `targetId`), and a plain-object `payload`. Violations SHALL throw `RuntimeError` code `CORE_OUTPUT_INVALID` (status 500).

#### Scenario: Malformed pure function output rejected

- **WHEN** a pure function returns an IntentSet with `httpStatus: 42`
- **THEN** `CORE_OUTPUT_INVALID` is thrown

### Requirement: Route allow-list

`authorizeIntent` SHALL reject any intent whose (entity, operation) pair has no matching entry in the route's `allowedIntents`, with reason `INTENT_ROUTE_NOT_ALLOWED`. Unknown entities fail with `INTENT_ENTITY_UNKNOWN`; unsupported types with `INTENT_TYPE_UNSUPPORTED`; invalid operations with `INTENT_OPERATION_INVALID`; non-object payloads with `INTENT_PAYLOAD_INVALID`.

#### Scenario: Intent not declared on route

- **WHEN** a pure function emits `UPDATE user` but the route only allows `CREATE user`
- **THEN** authorization fails with `INTENT_ROUTE_NOT_ALLOWED`

### Requirement: Field-level authorization

For CREATE, every payload field SHALL exist on the entity, not be `serverOwned`, be `creatable`, and be listed in an allowed-intent's `fields` (reasons: `INTENT_FIELD_UNKNOWN`, `INTENT_FIELD_SERVER_OWNED`, `INTENT_FIELD_NOT_CREATABLE`, `INTENT_ROUTE_NOT_ALLOWED`). For UPDATE, every field SHALL exist and be `mutable` (`INTENT_FIELD_NOT_MUTABLE` otherwise).

#### Scenario: Server-owned field blocked on create

- **WHEN** a CREATE intent payload includes a field marked `serverOwned: true`
- **THEN** authorization fails with `INTENT_FIELD_SERVER_OWNED`

### Requirement: Target discipline

CREATE intents SHALL NOT carry `targetId` (`INTENT_TARGET_FORBIDDEN`). UPDATE and DELETE SHALL carry a non-empty string `targetId` (`INTENT_TARGET_REQUIRED`) which must match an allowed-intent `targetId` expression resolved against the scope (`INTENT_TARGET_MISMATCH` on mismatch, `INTENT_TARGET_RESOLUTION_FAILED` when the expression cannot resolve to a string). UPDATE payloads SHALL be non-empty; DELETE payloads SHALL be empty (`INTENT_PAYLOAD_INVALID`). DELETE SHALL be rejected when the entity's `deletePolicy` is `forbidden` (`INTENT_DELETE_FORBIDDEN`).

#### Scenario: Update target must match route expression

- **WHEN** the route allows `UPDATE user` with `targetId: "$actor.id"` and the intent targets a different user's id
- **THEN** authorization fails with `INTENT_TARGET_MISMATCH`

### Requirement: Set-level authorization

`authorizeIntentSet` SHALL authorize intents in order and fail on the first rejection, reporting the failing intent's `index` in the error details. During route execution, a failed authorization SHALL abort with `RuntimeError` code `AUTHORIZATION_FAILED` (status 403).

#### Scenario: First failing intent reported

- **WHEN** the second of three intents is unauthorized
- **THEN** the result is `ok: false` with `details.index` = 1
