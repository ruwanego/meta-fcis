# Shell Runtime Specification

## Purpose

`@meta-fcis/shell` is a plain runtime scaffold: it holds a caller-supplied graph and adapters, delegates route execution to the core, and converts thrown `RuntimeError`s into result objects at the shell boundary. It is deliberately not a server.

## Requirements

### Requirement: Runtime creation

`createShellRuntime({ graph, adapters })` SHALL return a `ShellRuntime` whose `runRoute(request)` delegates to core `executeRoute` with the configured graph and adapters. The shell SHALL NOT validate, own, or mutate the graph itself.

#### Scenario: Delegation to core

- **WHEN** `runRoute` is called with a request
- **THEN** core `executeRoute(graph, request, adapters)` performs all semantics

### Requirement: Result boundary

`runRoute` SHALL never throw. Success returns `{ ok: true, value: ExecuteRouteResult }`. A `RuntimeError` from the core returns `{ ok: false, error }` preserving `code`, `message`, `status`, and `details`. Any other thrown value returns `{ ok: false, error }` with code `SHELL_INTERNAL_ERROR` and status 500.

#### Scenario: Core error converted

- **WHEN** the core throws `ROUTE_NOT_FOUND`
- **THEN** `runRoute` resolves to `ok: false` with `error.code = "ROUTE_NOT_FOUND"` and `error.status = 404`

#### Scenario: Unknown throw converted

- **WHEN** something other than a `RuntimeError` is thrown
- **THEN** `runRoute` resolves to `ok: false` with `error.code = "SHELL_INTERNAL_ERROR"`

### Requirement: Scaffold limits

The shell SHALL NOT serve HTTP, open sockets, load plugins, implement auth providers, connect to databases, or execute transactions. Its only runtime dependency is `@meta-fcis/core`.

#### Scenario: No transport

- **WHEN** the shell package is inspected
- **THEN** it exposes only `createShellRuntime`, `runRoute`, and its types — no server, listener, or plugin loader
