# Dependency Selection Specification

## Purpose

Resolve route dependency selectors into concrete, adapter-ready queries. Selectors declare *what* data a route needs; the persistence adapter decides *how* to load it.

## Requirements

### Requirement: Selector resolution

`resolveDependencySelector` SHALL resolve a selector's `where` clause expressions against the expression scope and return a resolved selector carrying `entity`, `cardinality`, resolved `where`, `project`, and `onMissing`, plus `limit` and `orderBy` only when present on the input. Resolution SHALL return a discriminated result and never throw.

#### Scenario: Where clause expressions resolved

- **WHEN** a selector `where` contains `$actor.id`
- **THEN** the resolved selector's `where` contains the actor's concrete id value

#### Scenario: Failed where resolution propagates

- **WHEN** a `where` expression fails to resolve
- **THEN** the selector resolution returns `ok: false` with the underlying error

### Requirement: Batch resolution for a route

`resolveDependencySelectors` SHALL resolve all of a route's selectors against the pre-load scope (dependencies empty at that point) and fail as a whole if any single selector fails.

#### Scenario: One bad selector fails the batch

- **WHEN** one of three selectors fails to resolve
- **THEN** the batch result is `ok: false` and no partial value is produced

### Requirement: Loading through the persistence adapter only

Resolved selectors SHALL be passed to `adapters.persistence.loadDependencies` for loading. The core SHALL NOT contain any query execution, database, or I/O logic, and SHALL skip the adapter call entirely when a route declares no selectors.

#### Scenario: No selectors, no adapter call

- **WHEN** a route has no `dependencies` declared
- **THEN** the persistence adapter is not invoked and dependencies are `{}`
