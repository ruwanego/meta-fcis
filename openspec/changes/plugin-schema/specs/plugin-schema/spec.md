## ADDED Requirements

### Requirement: Model schema factory
The plugin SHALL export `createModelSchema({ graph })` taking a validated `AppGraph` and returning `{ schema }` where `schema` implements core's `SchemaAdapter`. The plugin SHALL have no runtime dependency beyond `@meta-fcis/core`.

#### Scenario: Adapter created from graph
- **WHEN** `createModelSchema({ graph })` is called
- **THEN** it returns a `schema` adapter usable as `RuntimeAdapters.schema`

### Requirement: Schema reference resolution
`validate(schema, payload)` SHALL resolve a string `schema` to `graph.models[<name>]` and SHALL throw when the name matches no model (surfaced by core as `REQUEST_VALIDATION_FAILED`, status 400). An inline object `schema` with a `fields` map SHALL be interpreted with identical semantics.

#### Scenario: Named model resolved
- **WHEN** `validate("CompleteTaskInput", payload)` is called and the graph declares that model
- **THEN** the payload is checked against the model's fields

#### Scenario: Unknown model name throws
- **WHEN** `validate("MissingModel", payload)` is called
- **THEN** the adapter throws an error naming `MissingModel`

#### Scenario: Inline model object
- **WHEN** `validate({ fields: { title: { type: "string", required: true } } }, payload)` is called
- **THEN** the payload is checked against the inline fields

### Requirement: Payload validation
The adapter SHALL require the payload to be a plain object and SHALL enforce, per declared field: presence when `required` is true, and type conformance when present (`string | number | boolean | object | array | unknown`, where `object` means a plain object, `array` means an array, and `unknown` accepts any value). Fields present in the payload but not declared in the model SHALL be rejected. On success the adapter SHALL return the payload unchanged (no coercion, no defaults).

#### Scenario: Valid payload passes through
- **WHEN** the payload provides every required field with conforming types and no undeclared fields
- **THEN** `validate` returns the same payload value

#### Scenario: Missing required field
- **WHEN** a `required: true` field is absent from the payload
- **THEN** the adapter throws an error naming the field

#### Scenario: Type mismatch
- **WHEN** a declared `string` field carries a number
- **THEN** the adapter throws an error naming the field and expected type

#### Scenario: Undeclared field rejected
- **WHEN** the payload carries a field the model does not declare
- **THEN** the adapter throws an error naming the unexpected field

#### Scenario: Non-object payload rejected
- **WHEN** the payload is `null`, an array, or a primitive
- **THEN** the adapter throws

#### Scenario: Optional field may be absent
- **WHEN** a `required: false` field is absent
- **THEN** validation passes

### Requirement: Aggregate error reporting
When validation fails, the adapter SHALL throw a single error whose message names every failing field with its reason (not just the first failure), so core's `REQUEST_VALIDATION_FAILED` details identify all problems at once.

#### Scenario: Multiple failures reported together
- **WHEN** one required field is missing and another field has the wrong type
- **THEN** the thrown error's message names both fields
