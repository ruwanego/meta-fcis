## ADDED Requirements

### Requirement: HTTP transport factory
The plugin SHALL export `createHttpTransport(config)` where `config` provides the validated `AppGraph` and a `runRoute(request)` handler returning a shell-shaped result (`{ ok: true, value }` or `{ ok: false, error: { code, message, status, details? } }`). The factory SHALL return a transport with `listen(port?)` and `close()` and SHALL NOT import from `@meta-fcis/shell`.

#### Scenario: Transport created from graph and handler
- **WHEN** `createHttpTransport({ graph, runRoute })` is called
- **THEN** it returns a transport exposing `listen` and `close` without opening any socket yet

#### Scenario: Ephemeral port
- **WHEN** `listen()` is called without a port (or with port `0`)
- **THEN** the server binds an ephemeral port and `listen` resolves with the bound port number

### Requirement: HTTP request mapping
The transport SHALL map each incoming HTTP request to a core `Request`: the URL pathname becomes `route`, the parsed JSON body (when present) becomes `payload`, URL query parameters become `query`, and HTTP headers become `headers`. Requests without a body SHALL map to `payload: undefined`.

#### Scenario: JSON body request
- **WHEN** a request arrives at `/tasks` with body `{"title":"x"}` and query `?limit=1`
- **THEN** `runRoute` receives `{ route: "/tasks", payload: { title: "x" }, query: { limit: "1" }, headers: <request headers> }`

#### Scenario: Bodyless request
- **WHEN** a request arrives with an empty body
- **THEN** `runRoute` receives `payload: undefined` for that request

### Requirement: Result-to-response mapping
The transport SHALL map handler results to HTTP responses with `content-type: application/json`. A success result SHALL produce status `200` with the JSON-serialized `value`. A failure result SHALL produce the `status` carried by the error and the error object `{ code, message, status, details? }` as the body.

#### Scenario: Successful route
- **WHEN** `runRoute` returns `{ ok: true, value }`
- **THEN** the response is `200` with `value` serialized as the JSON body

#### Scenario: Runtime error passthrough
- **WHEN** `runRoute` returns `{ ok: false, error }` with `error.status` `404` and `error.code` `ROUTE_NOT_FOUND`
- **THEN** the response status is `404` and the body is the error object including its code

### Requirement: Route method enforcement
The transport SHALL match the URL pathname against the graph's routes (by `transport.path`, route `path`, or route name — mirroring core's matching). When the matched route declares `transport.method` and the request method differs, the transport SHALL respond `405` with body `{ code: "METHOD_NOT_ALLOWED", message, status: 405 }` and an `allow` header naming the declared method, without invoking `runRoute`. Routes without a `transport` block, and pathnames matching no route, SHALL be forwarded to `runRoute` regardless of method.

#### Scenario: Method mismatch rejected
- **WHEN** the matched route declares `transport.method: "POST"` and a `GET` request arrives
- **THEN** the response is `405` with code `METHOD_NOT_ALLOWED`, header `allow: POST`, and `runRoute` is never called

#### Scenario: Declared method accepted
- **WHEN** the matched route declares `transport.method: "POST"` and a `POST` request arrives
- **THEN** the request is forwarded to `runRoute`

#### Scenario: Undeclared method is open
- **WHEN** the matched route declares no `transport` block
- **THEN** any request method is forwarded to `runRoute`

#### Scenario: Unknown pathname falls through
- **WHEN** the pathname matches no route
- **THEN** the request is forwarded to `runRoute` (core answers `ROUTE_NOT_FOUND`)

### Requirement: Malformed request rejection
The transport SHALL reject a request whose body is present but is not valid JSON with status `400` and body `{ code: "REQUEST_MALFORMED", message, status: 400 }`, without invoking `runRoute`. `REQUEST_MALFORMED` is a transport-level code and SHALL NOT be added to core's `RuntimeErrorCode` union.

#### Scenario: Invalid JSON body
- **WHEN** a request arrives with body `{not json`
- **THEN** the response is `400` with code `REQUEST_MALFORMED` and `runRoute` is never called

### Requirement: Handler crash containment
The transport SHALL catch a thrown (or rejected) `runRoute` and respond `500` with body `{ code: "TRANSPORT_INTERNAL_ERROR", message, status: 500 }` instead of crashing the server or leaving the connection hanging.

#### Scenario: Handler throws
- **WHEN** `runRoute` throws for a request
- **THEN** that response is `500` with code `TRANSPORT_INTERNAL_ERROR` and the server keeps serving subsequent requests

### Requirement: Server lifecycle
The transport SHALL stop accepting connections when `close()` is called, and `close()` SHALL resolve once the server has shut down.

#### Scenario: Clean shutdown
- **WHEN** `close()` is called after `listen()`
- **THEN** the promise resolves and the port is released
