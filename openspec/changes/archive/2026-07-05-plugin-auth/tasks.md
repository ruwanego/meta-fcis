## 1. Package scaffolding

- [x] 1.1 Create `packages/plugin-auth` (package.json v0.1.0, dep `@meta-fcis/core: workspace:*`, tsconfig extending base)

## 2. Adapter implementation

- [x] 2.1 Implement `createTokenAuth({ tokens })` → `{ auth: AuthAdapter }`: bearer parsing (case-insensitive scheme, malformed header = no credentials), token→actor resolution (unknown presented token throws), `required` enforcement, anonymous actor for optional routes, `roles` enforcement naming missing roles

## 3. Verification

- [x] 3.1 Add `scripts/smoke.mjs`: known token resolves, unknown token throws, case-insensitive scheme, required-without-credentials throws, optional-without-credentials → anonymous, optional-with-valid-token → registered actor, role match passes, role miss throws naming the role; plus `executeRoute` round-trips asserting `AUTHENTICATION_FAILED` 401 (bad token) and a policy-driven `AUTHORIZATION_FAILED` 403 (wrong user's task) with real persistence
- [x] 3.2 Wire smoke into root `package.json` chain; `pnpm build && pnpm typecheck && pnpm smoke` green

## 4. Docs

- [x] 4.1 Update AGENTS.md workspace list and CHANGELOG Unreleased
