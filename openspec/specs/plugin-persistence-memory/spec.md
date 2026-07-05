# Plugin Persistence Memory Specification

## Purpose

The first real plugin: an in-memory mechanism behind the core persistence and transaction-executor contracts. Reference implementation for future persistence plugins and the test double for examples.

## Requirements

### Requirement: Plugin factory

`@meta-fcis/plugin-persistence-memory` SHALL export `createMemoryPersistence(config)` where `config` carries a validated `graph`, optional `seed` (`Record<entityName, row[]>`), and optional `idGenerator: () => string`. The factory SHALL return `{ persistence, transactionExecutor }` — a core `PersistenceAdapter` and a core `TransactionExecutor` sharing one in-memory store. The package SHALL depend only on `@meta-fcis/core` and SHALL NOT touch files, databases, or the network.

#### Scenario: Shared store

- **WHEN** the executor applies a CREATE and a subsequent route load selects that entity
- **THEN** the persistence adapter returns the created row

#### Scenario: Seed data available

- **WHEN** the factory is created with seed rows for an entity
- **THEN** selectors against that entity match the seeded rows

### Requirement: Selector query semantics

`loadDependencies` SHALL evaluate each resolved selector as: equality-match every `where` key against row fields (`Object.is`), sort by `orderBy` entries in order (asc/desc), apply `limit`, project rows to the `project` fields, then apply cardinality — `one` yields the first row or the `onMissing` outcome; `many` yields the row array. `onMissing` SHALL behave as: `null` → `null`, `empty` → `[]` (for `many`) or `null` (for `one`), `error` → throw an error naming the selector. A selector naming an entity absent from the graph SHALL throw. Returned rows SHALL be copies, never live store references.

#### Scenario: Filter, sort, limit, project

- **WHEN** a `many` selector has `where`, two `orderBy` keys, `limit: 2`, and a `project` list
- **THEN** the result is the first two matching rows in sort order, each containing only projected fields

#### Scenario: onMissing error

- **WHEN** a selector with `onMissing: "error"` matches zero rows
- **THEN** `loadDependencies` throws, and route execution surfaces `DEPENDENCY_LOAD_FAILED`

#### Scenario: No live references

- **WHEN** a caller mutates a row returned by `loadDependencies`
- **THEN** the store contents are unaffected

### Requirement: Executor semantics

`execute(plan)` SHALL apply operations in order: CREATE inserts a new row of the payload plus a generated id at the entity's `idField` (from `idGenerator`, default `crypto.randomUUID`); UPDATE shallow-merges the payload into the row with the given `targetId`; DELETE removes that row. UPDATE/DELETE against a missing row, or any operation against an unknown entity, SHALL throw. The result SHALL mirror plan order with `outcome: "applied"` per operation, and CREATE results SHALL carry the generated id as `targetId`.

#### Scenario: Create reports generated id

- **WHEN** a plan with one CREATE is executed
- **THEN** the result operation has `outcome: "applied"` and `targetId` set to the new row's id, and the row is retrievable by that id

#### Scenario: Update missing row

- **WHEN** an UPDATE targets an id not in the store
- **THEN** `execute` throws and the shell reports `TRANSACTION_EXECUTION_FAILED`

### Requirement: Atomic commit

`execute(plan)` SHALL be all-or-nothing: the store SHALL only be modified after every operation in the plan succeeds. A failure at any operation SHALL leave the store exactly as it was before `execute` was called.

#### Scenario: Mid-plan failure rolls back

- **WHEN** a plan's first CREATE would succeed but its second operation fails
- **THEN** `execute` throws and the store contains no trace of the CREATE
