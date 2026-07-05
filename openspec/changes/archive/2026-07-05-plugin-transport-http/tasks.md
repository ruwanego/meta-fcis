## 1. Graph schema: route method

- [x] 1.1 Type the existing route `transport` block (`transport?: { kind: "http"; method: HttpMethod; path: string }`) in core graph types; tighten `validateTransport` so `method` must be in the closed set (invalid → `GRAPH_INVALID` at `routes.<name>.transport.method`); extend graph smoke coverage for valid/invalid/omitted method

## 2. Package scaffolding

- [x] 2.1 Create `packages/plugin-transport-http` (package.json v0.1.0, dep `@meta-fcis/core: workspace:*`, tsconfig extending base) and register in the pnpm workspace build/typecheck flow

## 3. Transport implementation

- [x] 3.1 Define `HttpTransportConfig` (`graph` + `runRoute` handler) and structural `HttpRouteResult` types in `src/types.ts`
- [x] 3.2 Implement request mapping in `src/index.ts`: pathname → `route`, JSON body → `payload` (absent body → `undefined`), query params → `query`, headers → `headers`; malformed JSON → 400 `REQUEST_MALFORMED` without calling `runRoute`
- [x] 3.3 Implement method enforcement: match pathname to route (name or `path`); declared-method mismatch → 405 `METHOD_NOT_ALLOWED` + `allow` header before `runRoute`; undeclared method or unmatched pathname forwards
- [x] 3.4 Implement response mapping: success → 200 JSON `value`; failure → `error.status` with error body; thrown handler → 500 `TRANSPORT_INTERNAL_ERROR`; all responses `content-type: application/json`
- [x] 3.5 Implement `createHttpTransport` returning `{ listen(port?), close() }` over `node:http`; `listen` resolves with the bound port

## 4. Verification

- [x] 4.1 Add `scripts/smoke.mjs`: start on ephemeral port with a real `createShellRuntime` + memory persistence graph; assert success (200), ROUTE_NOT_FOUND (404), REQUEST_VALIDATION_FAILED (400), malformed body (400 REQUEST_MALFORMED), method mismatch (405 METHOD_NOT_ALLOWED + allow header), undeclared-method route open to any method, handler-throw containment (500), bodyless request, and clean `close()`
- [x] 4.2 Wire the smoke into root `package.json` smoke chain; `pnpm build && pnpm typecheck && pnpm smoke` green

## 5. Docs

- [x] 5.1 Update AGENTS.md workspace list and CHANGELOG Unreleased with the new package and route `method` field
