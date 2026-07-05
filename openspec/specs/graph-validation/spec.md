# Graph Validation Specification

## Purpose

Strictly validate an application graph (`app-graph.json` shape) before any route execution. The graph is the application contract; nothing runs against an invalid graph.

## Requirements

### Requirement: Strict structural validation

`validateGraph` SHALL accept an unknown value and either return it typed as `AppGraph` or throw a `RuntimeError` with code `GRAPH_INVALID` (status 500) whose details include the failing `path` and offending `value`.

#### Scenario: Valid graph passes

- **WHEN** a graph with valid `irVersion`, `application`, `engineCompatibility`, `entities`, `models`, and `routes` is validated
- **THEN** the same graph is returned typed as `AppGraph`

#### Scenario: Invalid graph rejected with path detail

- **WHEN** any required section is missing, of the wrong type, or contains an unknown enum value
- **THEN** a `RuntimeError` with code `GRAPH_INVALID` is thrown and `details.path` identifies the invalid location

### Requirement: Top-level contract

The validator SHALL require: non-empty `irVersion`; `application.name` non-empty (optional string `title`); `engineCompatibility.min` and `.max` non-empty; `entities`, `models`, and `routes` as plain objects; `plugins` as a plain object when present.

#### Scenario: Missing engine compatibility

- **WHEN** `engineCompatibility.min` is absent
- **THEN** validation fails with `GRAPH_INVALID` at path `engineCompatibility.min`

### Requirement: Entity definitions

Each entity SHALL declare a non-empty `table`, an `idField` that exists in `fields`, a `deletePolicy` of `hard | soft | forbidden`, and at least one field. Each field SHALL declare `type` (`string | number | boolean | object | array | unknown`) and booleans `required`, `mutable`, `creatable`, `serverOwned` (optional boolean `isId`).

#### Scenario: idField must exist in fields

- **WHEN** an entity declares `idField: "id"` but `fields` has no `id` key
- **THEN** validation fails with `GRAPH_INVALID`

### Requirement: Route transport declaration

A route MAY declare a `transport` block with `kind: "http"`, a `method` of `GET | POST | PUT | PATCH | DELETE`, and a non-empty `path`. `validateGraph` SHALL reject any other `method` value with `GRAPH_INVALID` and `details.path` pointing at `routes.<name>.transport.method`. Omitting `transport` SHALL remain valid and means the route accepts any method. The typed `AppGraph` SHALL carry the transport block (`RouteDefinition.transport`).

#### Scenario: Valid method accepted

- **WHEN** a route declares `transport: { kind: "http", method: "POST", path: "/tasks/complete" }`
- **THEN** validation passes and the typed graph carries the transport block

#### Scenario: Unknown method rejected

- **WHEN** a route declares `transport.method: "FETCH"`
- **THEN** validation fails with `GRAPH_INVALID` at path `routes.<name>.transport.method`

#### Scenario: Transport omitted

- **WHEN** a route declares no `transport`
- **THEN** validation passes unchanged (backward compatible)
