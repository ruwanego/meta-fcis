## Context

The shell exposes `runRoute(request: Request): Promise<ShellRouteResult>` and every layer below it already works (M0–M13). `RuntimeError` and `ShellError` already carry an HTTP-appropriate `status`, so the transport's job is nearly pure mapping: HTTP request in → `Request`, `ShellRouteResult` out → HTTP response. Core matches `request.route` against route names or route `path` values, so passing the URL pathname through is enough — the transport needs no routing table.

## Goals / Non-Goals

**Goals:**
- Serve a shell runtime over HTTP with zero new runtime dependencies (`node:http`).
- Keep the dependency direction intact: the plugin depends on `@meta-fcis/core` for types only; it never imports `@meta-fcis/shell`.
- Faithful status passthrough — the engine already decided the status; the transport never re-maps codes.

**Non-Goals:**
- Frameworks, TLS, CORS, streaming, path parameters, content negotiation, middleware.
- Method enforcement inside core: the graph declares `method`, only the transport reads it. No new `RuntimeErrorCode` members, no shell changes.
- Wiring HTTP into `examples/basic` (that is the `e2e-example` roadmap item).

## Decisions

- **`node:http` over a framework** — plugins own mechanisms and may use Node APIs (the forbidden-package list binds core only). A framework would add a dependency to save ~30 lines. Alternative (Hono/Elysia adapter) rejected; can be a separate plugin later if ever wanted.
- **Handler injection instead of a shell dependency** — `createHttpTransport({ runRoute })` takes the handler as config. The result type is declared structurally in the plugin (`HttpRouteResult`), shape-compatible with `ShellRouteResult`, so `createShellRuntime(...).runRoute` plugs in directly without creating a `plugins → shell` edge. Alternative (depend on `@meta-fcis/shell`) rejected: it would be the first plugin→shell edge and AGENTS.md would need a boundary change for one type import.
- **`method` lives in the graph, enforcement lives in the transport** — `RouteDefinition` gains optional `method` (`GET | POST | PUT | PATCH | DELETE`), validated by `validateGraph`. Core's `Request` stays method-free and `executeRoute` is untouched: 405 is HTTP semantics, so the transport gates it. It matches pathname → route the same way core does (route name or `path`) and rejects mismatches with `405 METHOD_NOT_ALLOWED` + `allow` header before calling `runRoute`. Alternatives rejected: method on core `Request` (drags HTTP vocabulary into the kernel and touches route-execution for no engine-semantic gain); no method at all (user wants REST-shaped APIs to be expressible in the contract).
- **Optional and closed** — omitted `method` means any method (all existing graphs stay valid); the value set is the closed five-verb list, no HEAD/OPTIONS until something needs them.
- **Transport-level error codes** — `REQUEST_MALFORMED` (bad JSON, 400), `METHOD_NOT_ALLOWED` (405), and `TRANSPORT_INTERNAL_ERROR` (handler threw, 500) live only in the plugin. Putting them in core's closed union would leak transport concerns into the kernel.
- **`listen()` resolves with the bound port** — supports ephemeral ports (`0`) so the smoke script can run in parallel with anything else without port collisions.
- **Query values stay strings** — `URLSearchParams` gives strings; coercion is schema territory (plugin-schema milestone), not the transport's.

## Risks / Trade-offs

- [Duplicate result shape drifts from `ShellRouteResult`] → the shape is 2 variants and structurally checked at the wiring site in the smoke script; any drift is a compile error there.
- [No request body size limit] → acceptable for a dev-tier transport; `// ponytail:` comment marks the ceiling (add a byte cap when exposed beyond localhost).
- [Transport duplicates core's route matching (name or `path`)] → the matching rule is two comparisons; if core's matching ever grows, the transport spec scenario ("unknown pathname falls through") keeps behavior safe — worst case a mismatch reaches core and gets `ROUTE_NOT_FOUND`.
