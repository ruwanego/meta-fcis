## Why

Every runtime pathway (routing, authorization, planning, execution, persistence) works end to end, but the only way to reach it is a hand-written script. An HTTP transport plugin is the missing edge that turns the engine into a servable web application — after this change a graph can be served and exercised with `curl`.

## What Changes

- Graph schema: the existing optional route `transport` block (`{ kind: "http", method, path }`) is promoted to a first-class typed field — `method` tightens from "any non-empty string" to the closed set `GET | POST | PUT | PATCH | DELETE` (`GRAPH_INVALID` otherwise), and `RouteDefinition` gains the `transport` type. Routes without `transport` accept any method (backward compatible).
- New workspace package `@meta-fcis/plugin-transport-http` (`packages/plugin-transport-http`): the first and only package allowed to know HTTP.
- `createHttpTransport(config)` factory (Config → Adapter, matching the plugin convention) that:
  - maps an incoming HTTP request to a core `Request` (path → `route`, JSON body → `payload`, query string → `query`, headers → `headers`),
  - enforces declared route methods: a request whose method mismatches the matched route's `method` gets `405` with transport code `METHOD_NOT_ALLOWED`, before `runRoute` is invoked,
  - delegates to a caller-supplied `runRoute` handler (structurally the shell's `runRoute` — the plugin does not depend on `@meta-fcis/shell`),
  - maps the result back to HTTP: success → `200` with the JSON value; failure → the `status` already carried by the shell error, with the `{ code, message, status, details? }` error body.
- Malformed JSON bodies are rejected by the transport itself with `400` and error code `REQUEST_MALFORMED`. Transport-level codes (`REQUEST_MALFORMED`, `METHOD_NOT_ALLOWED`, `TRANSPORT_INTERNAL_ERROR`) never enter core's `RuntimeErrorCode` union.
- Built on Node's built-in `node:http` — zero new runtime dependencies.
- Smoke script starts a server on an ephemeral port, exercises success, route-not-found, validation-failure, and malformed-body cases over real HTTP, and shuts down.

## Capabilities

### New Capabilities

- `plugin-transport-http`: HTTP transport plugin — request-to-`Request` mapping, result-to-response mapping, error-status passthrough, malformed-input rejection, server lifecycle (start/close).

### Modified Capabilities

- `graph-validation`: the route `transport` block becomes a specified requirement — `method` validated against the closed HTTP-method set (ADDED requirement; existing requirements unchanged).

## Non-goals

- No HTTP framework (Express/Fastify/Hono/Elysia remain forbidden; `node:http` suffices).
- No method enforcement inside core: `Request` stays method-free and `executeRoute` is untouched — the graph declares methods, the transport enforces them. No new `RuntimeErrorCode`, no shell changes.
- No routing table of its own: the graph's route `path` values are matched exactly as core already does; no path parameters, wildcards, or content negotiation.
- No TLS, CORS, compression, streaming, or middleware — later changes if ever needed.
- No wiring into `examples/basic`; the full HTTP-served example is the separate `e2e-example` roadmap item.

## Impact

- `packages/core`: `RouteDefinition` gains optional `method`; `validateGraph` gains one field check. No behavioral change for graphs that omit it.
- New package `packages/plugin-transport-http` (depends only on `@meta-fcis/core` for types; uses `node:http` at runtime — permitted in plugins, forbidden only in core).
- Root `package.json` smoke chain gains the transport smoke step.
- `AGENTS.md` workspace list and `ROADMAP.md`/`CHANGELOG.md` entries updated on ship.
