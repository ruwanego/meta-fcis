## Why

Request validation is the last fully fake adapter on the hot path: every runtime today ships a hand-written `schema.validate` that checks one hardcoded model. The graph already declares typed models (`models.<name>.fields` with `type` and `required`) — nothing interprets them. A schema plugin closes that gap, so a served graph rejects bad payloads by contract, not by bespoke code.

## What Changes

- New workspace package `@meta-fcis/plugin-schema` (`packages/plugin-schema`): a model-driven `SchemaAdapter` that interprets the graph's own model definitions — no external validator library.
- `createModelSchema({ graph })` factory (Config → Adapter) returning `{ schema }` where `validate(schema, payload)`:
  - resolves a string schema reference to `graph.models[<name>]` (unknown name → throw, surfaced by core as `REQUEST_VALIDATION_FAILED`),
  - accepts an inline model object (`{ fields: ... }`) with the same semantics,
  - checks the payload is a plain object, every `required` field is present, every present field matches its declared `type` (`string | number | boolean | object | array | unknown`), and rejects fields not declared in the model (closed contract),
  - returns the payload unchanged on success — no coercion, no defaults.
- Validation failures throw with messages naming every failing field path, so core's `REQUEST_VALIDATION_FAILED` (400) details are actionable.
- Core types: `models` in `AppGraph` gets a proper `ModelDefinition` type (typing only — `validateGraph` already enforces this shape, no behavior change).

## Capabilities

### New Capabilities

- `plugin-schema`: model-driven schema validation plugin — reference resolution, required/type/unknown-field checking, error reporting contract.

### Modified Capabilities

_None._ `validateGraph` behavior is unchanged (models were already strictly validated); core's pipeline and `REQUEST_VALIDATION_FAILED` semantics are untouched.

## Non-goals

- No external validator (Zod/Valibot stay out; the graph's model grammar is the schema language). A validator-wrapping plugin can be a separate package if richer constraints are ever needed.
- No coercion, defaults, or transformation — the adapter returns the payload as received or throws.
- No richer model grammar (min/max, patterns, nested field models, enums) — that is a graph-schema evolution, its own change.
- No validation of `params`/`query`/response bodies — core only calls the adapter for `route.schema` against the payload today; wiring more call sites is a core change out of scope here.
- No changes to shell, transport, or persistence packages.

## Impact

- New package `packages/plugin-schema` (depends only on `@meta-fcis/core`; zero runtime dependencies).
- `packages/core`: `ModelDefinition`/`ModelFieldDefinition` types added and `AppGraph.models` typed (compile-time only).
- Root `package.json` smoke chain gains the schema plugin smoke step.
- `AGENTS.md` workspace list, `ROADMAP.md`, `CHANGELOG.md` updated on ship.
