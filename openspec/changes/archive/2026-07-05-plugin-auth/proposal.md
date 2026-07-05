## Why

Auth is the last fake adapter: every runtime hardcodes `authenticate() { return user-1 }`, so any request is any user. A token auth plugin makes identity real — bearer tokens resolve to actors, unauthenticated requests are rejected, and route role requirements are enforced — completing the plugin set needed for the e2e example and the 0.2.0 line.

## What Changes

- New workspace package `@meta-fcis/plugin-auth` (`packages/plugin-auth`): a token-registry `AuthAdapter` with zero runtime dependencies.
- `createTokenAuth({ tokens })` factory (Config → Adapter) returning `{ auth }` where `tokens` maps bearer tokens to `Actor`s. `authenticate(request, authConfig)`:
  - parses `authorization: Bearer <token>` from request headers (scheme case-insensitive),
  - resolves the token to its actor; unknown token with credentials presented → throw,
  - `authConfig.required: true` with no/invalid credentials → throw (surfaced by core as `AUTHENTICATION_FAILED`, 401),
  - `authConfig.required: false` (or absent) with no credentials → returns the anonymous actor (`{ id: "anonymous", roles: [] }`),
  - `authConfig.roles` declared → the resolved actor must hold at least one listed role, else throw.
- All failures surface through core's existing mapping: adapter throw → `AUTHENTICATION_FAILED` (401). No core changes.

## Capabilities

### New Capabilities

- `plugin-auth`: token-registry authentication plugin — bearer parsing, token→actor resolution, required/optional semantics, role enforcement, anonymous actor.

### Modified Capabilities

_None._ Core pipeline, `AuthAdapter` interface, and error mapping are untouched.

## Non-goals

- No JWT/OIDC/session libraries and no cryptography — the registry maps opaque tokens to actors. A signed-token plugin can be a separate package when needed.
- No token issuance, expiry, refresh, or revocation — the registry is static config; rotation means recreating the adapter.
- No distinct 403 for role failures: core maps every auth-adapter throw to `AUTHENTICATION_FAILED` (401). Changing that mapping is a core change out of scope here (route policies already provide 403 via `AUTHORIZATION_FAILED`).
- No changes to core, shell, transport, schema, or persistence packages; `examples/basic` keeps its fake (full wiring is e2e-example).

## Impact

- New package `packages/plugin-auth` (depends only on `@meta-fcis/core`).
- Root `package.json` smoke chain gains the auth plugin smoke step.
- `AGENTS.md` workspace list, `ROADMAP.md`, `CHANGELOG.md` updated on ship.
