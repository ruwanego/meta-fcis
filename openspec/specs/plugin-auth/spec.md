# Plugin: Token Auth Specification

## Purpose

Token-registry authentication. `@meta-fcis/plugin-auth` provides an `AuthAdapter` resolving opaque bearer tokens to actors from caller-supplied config, enforcing route `auth.required` and `auth.roles`. Failures surface through core as `AUTHENTICATION_FAILED` (401); route policies remain the 403 mechanism. Zero runtime dependencies beyond `@meta-fcis/core`.

## Requirements

### Requirement: Token auth factory
The plugin SHALL export `createTokenAuth({ tokens })` where `tokens` maps opaque bearer tokens to core `Actor`s, returning `{ auth }` implementing core's `AuthAdapter`. The plugin SHALL have no runtime dependency beyond `@meta-fcis/core`.

#### Scenario: Adapter created from a token registry
- **WHEN** `createTokenAuth({ tokens: { "secret-1": { id: "user-1", roles: ["user"] } } })` is called
- **THEN** it returns an `auth` adapter usable as `RuntimeAdapters.auth`

### Requirement: Bearer token resolution
`authenticate(request, authConfig)` SHALL read the `authorization` header, accept the `Bearer <token>` scheme case-insensitively, and resolve the token through the registry. A presented token that matches no registry entry SHALL throw (surfaced by core as `AUTHENTICATION_FAILED`, status 401). A malformed `authorization` header SHALL be treated as no credentials.

#### Scenario: Known token resolves to its actor
- **WHEN** a request carries `authorization: Bearer secret-1`
- **THEN** `authenticate` returns the actor registered for `secret-1`

#### Scenario: Unknown token rejected
- **WHEN** a request carries `authorization: Bearer wrong` and the registry has no such token
- **THEN** the adapter throws, and core surfaces `AUTHENTICATION_FAILED` with status 401

#### Scenario: Case-insensitive scheme
- **WHEN** a request carries `authorization: bearer secret-1`
- **THEN** the token resolves normally

### Requirement: Required and optional authentication
When `authConfig.required` is true, requests without resolvable credentials SHALL be rejected with a throw. When `authConfig` is absent or `required` is false, requests without credentials SHALL resolve to the anonymous actor `{ id: "anonymous", roles: [] }`; credentials, when presented, SHALL still be resolved (and still fail on unknown tokens).

#### Scenario: Required route without credentials
- **WHEN** `authConfig.required` is true and the request has no `authorization` header
- **THEN** the adapter throws (`AUTHENTICATION_FAILED`, 401)

#### Scenario: Optional route without credentials
- **WHEN** `authConfig.required` is false and the request has no `authorization` header
- **THEN** `authenticate` returns `{ id: "anonymous", roles: [] }`

#### Scenario: Optional route with valid credentials
- **WHEN** `authConfig.required` is false and a known token is presented
- **THEN** the registered actor is returned, not the anonymous actor

### Requirement: Role enforcement
When `authConfig.roles` is a non-empty array, the resolved actor SHALL hold at least one of the listed roles; otherwise the adapter SHALL throw with a message naming the missing roles (surfaced by core as `AUTHENTICATION_FAILED`, status 401 — route policies remain the 403 mechanism).

#### Scenario: Actor holds a required role
- **WHEN** the route declares `roles: ["admin", "user"]` and the actor's roles include `user`
- **THEN** authentication succeeds

#### Scenario: Actor lacks all required roles
- **WHEN** the route declares `roles: ["admin"]` and the actor's roles are `["user"]`
- **THEN** the adapter throws an error naming `admin`
