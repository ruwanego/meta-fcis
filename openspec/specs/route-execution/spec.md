# Route Execution Specification

## Purpose

`executeRoute` is the core semantic pipeline: it takes a graph, a request, and runtime adapters, and produces a validated IntentSet plus a transaction plan — or throws a typed `RuntimeError`. It is the only entry point that wires the semantic modules together.

## Requirements

### Requirement: Pipeline order

`executeRoute(graph, request, adapters)` SHALL execute exactly: (1) validate graph, (2) find route, (3) validate payload via the schema adapter (only when the route declares a `schema`), (4) authenticate via the auth adapter, (5) resolve dependency selectors then load via the persistence adapter, (6) build the ContextBundle (`actor`, `data`, `dependencies`), (7) evaluate the route policy, (8) invoke the pure function via the pureInvoker adapter, (9) validate the IntentSet shape, (10) authorize the IntentSet, (11) build the transaction plan, (12) return `{ intentSet, transactionPlan }`.

#### Scenario: Successful execution

- **WHEN** a valid request hits a valid route and every stage passes
- **THEN** the result contains the validated IntentSet and the transaction plan, and no transaction is executed

### Requirement: Route lookup

Routes SHALL be found by key in `graph.routes`, falling back to matching a route's `path`. A miss SHALL throw `ROUTE_NOT_FOUND` (status 404).

#### Scenario: Unknown route

- **WHEN** the request route matches neither a route key nor a route path
- **THEN** `ROUTE_NOT_FOUND` is thrown with the requested key in details

### Requirement: Typed failure at every stage

Every known failure SHALL surface as a thrown `RuntimeError` with the stage's code and HTTP-ish status: `GRAPH_INVALID` 500, `ROUTE_NOT_FOUND` 404, `REQUEST_VALIDATION_FAILED` 400, `AUTHENTICATION_FAILED` 401, `DEPENDENCY_SELECTION_FAILED` 500, `DEPENDENCY_LOAD_FAILED` 500, `POLICY_EVALUATION_FAILED` 500, `AUTHORIZATION_FAILED` 403, `PURE_FUNCTION_FAILED` 500, `CORE_OUTPUT_INVALID` 500, `TRANSACTION_PLANNING_FAILED` 500. Any unexpected error SHALL be wrapped as `INTERNAL_ERROR` (status 500). `executeRoute` SHALL never return an error object.

#### Scenario: Adapter failure mapped to stage code

- **WHEN** the auth adapter throws
- **THEN** `executeRoute` throws `AUTHENTICATION_FAILED` with status 401 and the cause in details

#### Scenario: Unknown error wrapped

- **WHEN** a non-`RuntimeError` escapes any stage
- **THEN** it is rethrown as `INTERNAL_ERROR` with status 500

### Requirement: RuntimeError contract

`RuntimeError` SHALL carry a `code` from the closed `RuntimeErrorCode` union, a `message`, a `status` defaulting to 500, and optional `details`. Known pipeline failures SHALL use `RuntimeError`, never plain `Error`. Transport plugins (future) convert these to HTTP responses; the core knows nothing about HTTP transport.

#### Scenario: Default status

- **WHEN** a `RuntimeError` is constructed without a status
- **THEN** its status is 500

### Requirement: Adapter boundary

The core SHALL interact with the outside world only through the `RuntimeAdapters` interfaces (`schema`, `auth`, `persistence`, `pureInvoker`). Pure functions SHALL receive only the ContextBundle — never framework contexts, raw requests, database clients, loggers, filesystem, or environment variables.

#### Scenario: Pure function isolation

- **WHEN** the pure function is invoked
- **THEN** it receives exactly `{ actor, data, dependencies }`
