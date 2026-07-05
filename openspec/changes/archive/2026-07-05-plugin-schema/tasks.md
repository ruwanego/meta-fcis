## 1. Core model typing

- [x] 1.1 Add `ModelFieldDefinition` / `ModelDefinition` to core graph types and type `AppGraph.models` (compile-time only; `validateGraph` unchanged); export from core index

## 2. Package scaffolding

- [x] 2.1 Create `packages/plugin-schema` (package.json v0.1.0, dep `@meta-fcis/core: workspace:*`, tsconfig extending base)

## 3. Adapter implementation

- [x] 3.1 Implement `createModelSchema({ graph })` → `{ schema: SchemaAdapter }`: resolve string references to `graph.models` (unknown name throws), accept inline `{ fields }` objects
- [x] 3.2 Implement payload checking: plain-object guard, required-field presence, per-type conformance (`string | number | boolean | object | array | unknown`), undeclared-field rejection; aggregate all failures into one thrown error naming each field; return payload unchanged on success

## 4. Verification

- [x] 4.1 Add `scripts/smoke.mjs`: valid payload passthrough, missing required, type mismatch, undeclared field, multiple failures in one message, unknown model name, inline schema, non-object payload, optional-field absence; plus one `executeRoute` round-trip asserting `REQUEST_VALIDATION_FAILED` (400) surfaces the aggregate message
- [x] 4.2 Wire smoke into root `package.json` chain; `pnpm build && pnpm typecheck && pnpm smoke` green (examples/basic keeps its fake — full wiring is the e2e-example milestone)

## 5. Docs

- [x] 5.1 Update AGENTS.md workspace list and CHANGELOG Unreleased
