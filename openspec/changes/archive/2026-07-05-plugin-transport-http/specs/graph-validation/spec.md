## ADDED Requirements

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
