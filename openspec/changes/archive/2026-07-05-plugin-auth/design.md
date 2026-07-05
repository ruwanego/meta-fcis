## Context

`executeRoute` calls `adapters.auth.authenticate(request, routeConfig.auth)` and converts any throw into `AUTHENTICATION_FAILED` (401). The adapter receives the route's `auth` block (`required: boolean`, `roles?: string[]`), so required/optional semantics and role checks are adapter responsibilities — core has no separate role-check step. Every runtime today fakes this adapter with a hardcoded actor.

## Goals / Non-Goals

**Goals:**
- Real identity with zero dependencies: opaque bearer tokens resolved through a config registry.
- Full use of the existing `authConfig` contract: `required` and `roles` both enforced in the adapter.
- Completes the plugin set (persistence, schema, transport, auth) ahead of e2e-example.

**Non-Goals:**
- Signed/expiring tokens, JWT/OIDC, sessions, issuance/revocation, multi-tenancy helpers, core changes.

## Decisions

- **Static token registry over signed tokens** — `Record<token, Actor>` in config is the minimum real mechanism: identity actually varies by credential and bad credentials actually fail. Alternatives rejected for now: JWT via `jose` (adds a dependency and key management for no gain until tokens must be minted by another party); HMAC-signed tokens via `node:crypto` (stateless, but the engine has no token issuer yet, so there is nothing to sign). Both remain possible as separate plugins behind the same adapter interface.
- **Role failure throws → 401, not 403** — core maps every auth-adapter throw to `AUTHENTICATION_FAILED` (401). Semantically a role failure is closer to 403, but giving the adapter a way to signal 403 means changing core's error mapping — deliberately out of scope. Route policies (`AUTHORIZATION_FAILED`, 403) are the engine's authorization mechanism; `authConfig.roles` is a coarse pre-filter. The spec pins this so it is a documented behavior, not an accident.
- **Anonymous actor is a constant** — `{ id: "anonymous", roles: [] }`, not configurable. A configurable anonymous actor is speculative; policies can already branch on `$actor.id`. Add config when a graph needs it.
- **Malformed header = no credentials** — a header that isn't `Bearer <token>` is treated as absent rather than rejected: on optional routes it yields the anonymous actor, on required routes it fails the `required` check. This keeps exactly one rejection reason per failure and avoids parsing pedantry.
- **Presented credentials are always verified** — even on optional routes, an unknown token throws instead of silently downgrading to anonymous. Silent downgrade would let a typo'd token masquerade as an intentional anonymous request.

## Risks / Trade-offs

- [Tokens in plain config] → dev-tier by design, like the in-memory store; the config comes from the caller, which can load it from env/secrets. `// ponytail:` comment marks the ceiling (signed-token plugin when tokens cross trust boundaries).
- [401 for role failures may surprise API consumers] → specced explicitly; transport passes the engine-decided status through, and route policies provide proper 403s.
- [Static registry can't rotate at runtime] → recreate the runtime with new config; acceptable until there's a deployment story.
