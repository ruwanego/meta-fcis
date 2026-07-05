# Policy Evaluation Specification

## Purpose

Evaluate declarative route policies (`effect` + `when` expression) to allow or deny a request before the pure function runs.

## Requirements

### Requirement: Policy semantics

`evaluatePolicy` SHALL return `{ ok: true, value: true }` (allow) when no policy is defined. With a policy, it SHALL evaluate the `when` expression to a boolean and apply the effect: `allow` grants when `when` is true; `deny` grants when `when` is false. An unknown effect SHALL fail with reason `POLICY_EXPRESSION_INVALID`. Evaluation SHALL return a discriminated result and never throw.

#### Scenario: No policy allows by default

- **WHEN** a route has no `policy`
- **THEN** evaluation yields `ok: true, value: true`

#### Scenario: Allow effect

- **WHEN** `effect: "allow"` and `when` evaluates to `true`
- **THEN** the request is allowed; when `when` is `false`, it is denied

#### Scenario: Deny effect inverts

- **WHEN** `effect: "deny"` and `when` evaluates to `true`
- **THEN** the request is denied

### Requirement: Pipeline enforcement

During route execution, a policy evaluation error SHALL abort with `RuntimeError` code `POLICY_EVALUATION_FAILED` (status 500); a policy that evaluates cleanly to deny SHALL abort with code `AUTHORIZATION_FAILED` (status 403) and details `reason: "ROUTE_POLICY_DENIED"`.

#### Scenario: Denied route returns 403 semantics

- **WHEN** the route policy denies the request
- **THEN** `executeRoute` throws `AUTHORIZATION_FAILED` with status 403 before the pure function is invoked
