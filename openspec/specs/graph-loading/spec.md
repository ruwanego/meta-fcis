# Graph Loading Specification

## Purpose

Provide the front door for application graphs: load from an object or JSON string, validate structurally, and enforce engine compatibility before anything runs against the graph.

## Requirements

### Requirement: Graph loading entry point

The core SHALL export `loadGraph(input: unknown): AppGraph` which accepts either an already-parsed value or a JSON string. String input SHALL be parsed as JSON; a parse failure SHALL throw `RuntimeError` code `GRAPH_INVALID` (status 500) with the parse error in details. The (parsed) value SHALL then be validated with the existing strict graph validation, and finally checked for engine compatibility.

#### Scenario: Object input

- **WHEN** `loadGraph` is called with a valid graph object
- **THEN** it returns the graph typed as `AppGraph`

#### Scenario: JSON string input

- **WHEN** `loadGraph` is called with the JSON text of a valid graph
- **THEN** it parses and returns the graph typed as `AppGraph`

#### Scenario: Malformed JSON rejected

- **WHEN** `loadGraph` is called with a string that is not valid JSON
- **THEN** it throws `GRAPH_INVALID` with the parse error in details

#### Scenario: Structural validation delegated

- **WHEN** `loadGraph` receives input that parses but is not a valid graph
- **THEN** it throws the same `GRAPH_INVALID` error that `validateGraph` produces

### Requirement: Engine version constant

The core SHALL export an `ENGINE_VERSION` constant (`X.Y.Z`) identifying the engine's semantic version. It SHALL equal the `@meta-fcis/core` package version; smoke verification SHALL fail when they drift. The core SHALL NOT read files or environment to obtain it.

#### Scenario: Version drift caught

- **WHEN** `ENGINE_VERSION` differs from the version in `packages/core/package.json`
- **THEN** core smoke verification fails

### Requirement: Engine compatibility enforcement

`loadGraph` SHALL enforce `engineCompatibility` against `ENGINE_VERSION` using this grammar: `min` MUST be a plain version `X.Y.Z`, satisfied when the engine version is greater than or equal to `min` by numeric triple comparison; `max` MUST be a plain version (engine less than or equal to `max`) or a wildcard `X.x` / `X.Y.x` (engine major — or major.minor — equals the prefix). A malformed `min` or `max` SHALL throw `GRAPH_INVALID` with the offending path in details. An engine version outside the range SHALL throw `RuntimeError` code `GRAPH_INCOMPATIBLE` (status 500) with `engineVersion`, `min`, and `max` in details. The core SHALL include `GRAPH_INCOMPATIBLE` in the `RuntimeErrorCode` union.

#### Scenario: Compatible graph accepted

- **WHEN** the engine version is `0.1.0` and the graph declares `min: "0.1.0"`, `max: "0.x"`
- **THEN** `loadGraph` returns the graph

#### Scenario: Engine below minimum

- **WHEN** the graph declares `min` greater than the engine version
- **THEN** `loadGraph` throws `GRAPH_INCOMPATIBLE` with `engineVersion`, `min`, and `max` in details

#### Scenario: Engine above maximum

- **WHEN** the graph declares `max: "0.x"` and the engine version is `1.0.0`
- **THEN** `loadGraph` throws `GRAPH_INCOMPATIBLE`

#### Scenario: Malformed range rejected as invalid graph

- **WHEN** the graph declares `min: "banana"`
- **THEN** `loadGraph` throws `GRAPH_INVALID` naming the `engineCompatibility.min` path

### Requirement: Existing entry points unchanged

`validateGraph` SHALL remain purely structural (no compatibility enforcement), and `executeRoute` and the shell SHALL NOT change behavior. `loadGraph` is the caller's front door; callers who bypass it get exactly today's semantics.

#### Scenario: Pipeline unaffected

- **WHEN** an incompatible-but-structurally-valid graph is passed directly to `executeRoute`
- **THEN** execution proceeds as it does today (no compatibility check on the request path)
