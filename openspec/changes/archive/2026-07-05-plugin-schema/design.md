## Context

`executeRoute` already calls `adapters.schema.validate(routeConfig.schema, request.payload)` and converts any throw into `REQUEST_VALIDATION_FAILED` (400) — the pipeline seam exists and is specced. `validateGraph` already strictly enforces model shape (`fields.<name>.type` in the closed type set, `required` boolean). The only missing piece is an adapter that *interprets* those models at request time. `route.schema` is `string | Record<string, unknown>` (model name or inline definition).

## Goals / Non-Goals

**Goals:**
- Replace hand-written schema fakes with a graph-driven validator: one source of truth for request shapes.
- Zero runtime dependencies; the plugin only reads `AppGraph`.
- Actionable 400s: every failing field named in one error.

**Non-Goals:**
- External validator libraries, richer constraint grammar (ranges, patterns, enums, nesting), coercion/defaults, params/query/response validation, changes to core pipeline or other packages.

## Decisions

- **Interpret graph models instead of wrapping a validator library** — the roadmap sketch said "wrapping a real validator", but the graph already *is* the schema language: models are strictly validated at load time and routes reference them by name. Wrapping Zod would mean re-expressing graph models as Zod schemas at startup — a translation layer plus a dependency to enforce six field types. The interpreter is ~60 lines with zero deps. Alternative (Zod-wrapping plugin) rejected for now; it stays possible as a separate package when models grow constraints the closed grammar can't express.
- **Closed contract: undeclared fields rejected** — LLM-safe engine principle: a payload field the contract doesn't name is a bug or an injection attempt, not an extra. Alternative (ignore unknown fields, Postel-style) rejected: silent acceptance hides contract drift and widens the intent-authorization attack surface upstream of the pure function.
- **Aggregate errors, throw once** — collect all field failures and throw a single `Error` whose message lists them. Core already wraps it with status 400 and puts the error in `details`; no new error type needed.
- **`unknown` type accepts anything, `object` means plain object** — mirrors the field-type semantics core's own graph validator uses; `null` is not an `object` (matches how the persistence plugin treats values).
- **Type the models in core (`ModelDefinition`)** — `AppGraph.models` is currently `Record<string, unknown>` even though `validateGraph` fully enforces its shape. Typing it (like M14 did for `transport`) lets the plugin read models without casts. Compile-time only; no validator change, so no `graph-validation` spec delta.
- **Factory takes the whole graph, not a models map** — matches the plugin convention (`createMemoryPersistence({ graph })`, `createHttpTransport({ graph })`); the config shape stays uniform across plugins.

## Risks / Trade-offs

- [Model grammar is coarse (no nesting/enums/ranges)] → deliberate; the grammar lives in the graph spec and can grow by its own change. The plugin's per-type check functions make new types a one-line addition each.
- [Inline object schemas are typed loosely (`Record<string, unknown>`)] → the adapter validates the inline shape minimally (must have a `fields` map) and fails with a clear message otherwise — same failure channel as everything else (`REQUEST_VALIDATION_FAILED`).
- [Rejecting undeclared fields may break sloppy clients] → intended behavior for an LLM-safe engine; the aggregate error names the offending fields so the fix is obvious.
