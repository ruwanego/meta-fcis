# Expression Resolution Specification

## Purpose

Resolve `$`-prefixed path expressions against a fixed, safe scope. This is the only dynamic-value mechanism in the graph — no eval, no templates, no functions.

## Requirements

### Requirement: Path expression syntax

`resolveExpression` SHALL only resolve string expressions of the form `$<root>.<segment>...` where `<root>` is exactly `request`, `actor`, or `dependencies`. Resolution SHALL return a discriminated result (`ok: true` with `value`, or `ok: false` with a `reason`) and never throw.

#### Scenario: Valid path resolves

- **WHEN** `$actor.id` is resolved against a scope where `actor.id` is `"u1"`
- **THEN** the result is `{ ok: true, value: "u1" }`

#### Scenario: Non-string expression rejected

- **WHEN** the expression is not a string
- **THEN** the result is `{ ok: false, reason: "EXPRESSION_NOT_STRING" }`

#### Scenario: Missing `$` prefix or empty path rejected

- **WHEN** the expression does not start with `$`, or is `$` alone
- **THEN** the result is `{ ok: false, reason: "EXPRESSION_NOT_PATH" }`

#### Scenario: Unknown scope root rejected

- **WHEN** the first segment is not `request`, `actor`, or `dependencies` (e.g. `$env.SECRET`)
- **THEN** the result is `{ ok: false, reason: "UNKNOWN_SCOPE" }`

#### Scenario: Null scope root rejected

- **WHEN** the addressed scope root is `null`
- **THEN** the result is `{ ok: false, reason: "NULL_SCOPE" }`

### Requirement: Expression scope shape

The expression scope SHALL expose exactly `request` (with `payload`, `params`, `query`), `actor`, and `dependencies`. Pure request/actor/dependency data only — no environment, filesystem, clients, or framework objects are ever reachable from an expression.

#### Scenario: Scope built during route execution

- **WHEN** the pipeline builds an expression scope
- **THEN** it contains only the validated payload, request params/query, the authenticated actor, and loaded dependencies
