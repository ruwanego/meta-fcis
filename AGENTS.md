# AGENTS.md

# Meta-FCIS Agent Instructions

This repository is for Meta-FCIS: a graph-centered, plugin-driven, LLM-safe application engine.

Read this file before making any change.

Do not skip it.

---

## 1. Core Architecture

Meta-FCIS is not a web framework.

Meta-FCIS is not built around TypeSpec, Elysia, Eden, Effect, SQL, JWT, Bun, or Node HTTP.

Meta-FCIS is a microkernel that interprets an application graph.

The graph is the application contract.

Everything else is a plugin.

```txt
app-graph.json = application contract
@meta-fcis/core = semantic microkernel
plugins = mechanisms
pure.ts = deterministic business decision logic
```

The core owns meanings.

Plugins own mechanisms.

Pure functions own domain decisions.

---

## 2. Current Core Status

Current completed core milestones:

```txt
Milestone 0:
- protocol types
- graph types
- adapter interfaces
- RuntimeError
- validateGraph
- validateIntentSet
- executeRoute skeleton

Milestone 1:
- smoke verification

Milestone 2:
- expression resolver

Milestone 3:
- dependency selector resolver

Milestone 4:
- policy evaluator

Milestone 5:
- intent authorization

Milestone 6:
- transaction planning
```

Current status:

```txt
Current status: @meta-fcis/core standalone semantic functions completed through Milestone 6.
Next milestone must be explicitly requested.
```

Do not build future milestones.

Do not add frameworks.

Do not add real plugins.

Do not add database code.

Do not add HTTP server code.

---

## 3. Repository Structure

Expected structure:

```txt
meta-fcis/
  AGENTS.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  packages/
    core/
      package.json
      tsconfig.json
      scripts/
        smoke.mjs
        expression-smoke.mjs
        selector-smoke.mjs
        policy-smoke.mjs
        intent-smoke.mjs
        transaction-smoke.mjs
      src/
        index.ts

        protocol/
          actor.ts
          context.ts
          intent.ts
          request.ts
          response.ts

        graph/
          types.ts
          validateGraph.ts

        adapters/
          types.ts

        errors/
          RuntimeError.ts

        pipeline/
          executeRoute.ts
          validateIntentSet.ts

        expressions/
          types.ts
          resolvePath.ts
          resolveExpression.ts

        selectors/
          types.ts
          resolveSelectorWhere.ts
          resolveDependencySelector.ts
          resolveDependencySelectors.ts

        policies/
          types.ts
          evaluatePolicyExpression.ts
          evaluatePolicy.ts

        intents/
          types.ts
          authorizeIntent.ts
          authorizeIntentSet.ts

        transactions/
          types.ts
          buildTransactionPlan.ts
```

Do not invent extra packages yet.

Do not create `shell`.

Do not create plugins yet.

Do not create examples yet unless explicitly requested.

---

## 4. Package Boundaries

`@meta-fcis/core` must be framework-free and runtime-agnostic.

Allowed inside `packages/core`:

```txt
TypeScript types
plain TypeScript functions
small structural validators
adapter interfaces
error class
pipeline skeleton
```

Forbidden inside `packages/core`:

```txt
TypeSpec
Elysia
Eden
Effect
Zod
Valibot
Express
Fastify
Hono
SQL
Prisma
Drizzle
database clients
auth implementations
JWT libraries
OIDC libraries
Redis
queues
email providers
HTTP servers
Bun-specific APIs
Node-specific HTTP APIs
decorators
code generation
```

No runtime dependencies in `@meta-fcis/core`.

---

## 5. Dependency Direction

Correct dependency direction:

```txt
shell -> core
plugins -> core
examples -> core
core -> nothing framework-specific
```

Wrong dependency direction:

```txt
core -> shell
core -> plugin
core -> Elysia
core -> Effect
core -> TypeSpec
core -> SQL
```

The core must not know plugin internals.

The core only knows adapter interfaces.

---

## 6. Core Execution Model

The first core pipeline is:

```txt
validate graph
find route
validate request through schema adapter
authenticate through auth adapter
load dependencies through persistence adapter
build ContextBundle
invoke pure function through pureInvoker
validate IntentSet shape
return ExecuteRouteResult
```

executeRoute.ts must not yet be wired to policy evaluation, intent authorization, transaction planning, or transaction execution unless explicitly requested in a future milestone.

Current core must not:

```txt
execute intents
execute transactions
compile TypeSpec
serve HTTP
generate clients
```

---

## 7. Pure Function Boundary

Pure domain functions are not implemented inside core.

But core defines their boundary.

Pure function shape:

```ts
ContextBundle -> IntentSet
```

Pure functions receive clean data only.

They must not receive:

```txt
HTTP framework context
raw request object
database client
ORM client
auth provider
logger
filesystem
environment variables
```

---

## 8. Plugin Model

Plugins are functions that return adapter objects.

Example concept:

```ts
const plugin = somePlugin(config);
```

The returned object implements a core-owned interface.

Plugin factory:

```txt
Config -> Adapter
```

Pure function:

```txt
ContextBundle -> IntentSet
```

Do not confuse plugin functions with pure domain functions.

Plugins may do effects.

Pure functions may not.

---

## 9. TypeScript Rules

Use TypeScript.

Use ESM.

Use NodeNext.

Use strict mode.

Use `.js` extensions in relative imports.

Correct:

```ts
import { RuntimeError } from "../errors/RuntimeError.js";
```

Wrong:

```ts
import { RuntimeError } from "../errors/RuntimeError";
```

Do not use CommonJS.

Do not use `require`.

Do not weaken TypeScript settings.

---

## 10. Root Workspace

Use pnpm workspace.

Root `package.json` must be private.

Root manages packages only.

Root is not the core library.

Expected root package intent:

```json
{
  "name": "meta-fcis",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@latest",
  "scripts": {
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck"
  }
}
```

---

## 11. Git Discipline

Strict git discipline is mandatory.

Before implementation:

```txt
git status
```

If not a git repo:

```txt
git init
```

Create `.gitignore` before package install.

Never commit:

```txt
node_modules/
dist/
coverage/
.env
.env.*
logs
temporary agent files
```

Work on:

```txt
feat/core-m0
```

Use small commits.

Do not make one giant commit.

Required commit style:

```txt
chore(repo): initialize git hygiene
chore(workspace): add pnpm monorepo scaffold
feat(core): add protocol and graph types
feat(core): add runtime adapters and errors
feat(core): add graph and intent validators
feat(core): add executeRoute pipeline skeleton
chore(core): export public API
```

Before each commit:

```txt
pnpm build
pnpm typecheck
git diff --stat
git status
```

Only commit when build and typecheck pass.

If they fail, fix before committing.

---

## 12. Implementation Order

Completed order:

```txt
1. Git hygiene
2. Workspace scaffold
3. Core package scaffold
4. Protocol and graph contracts
5. Runtime errors and adapter interfaces
6. Graph and IntentSet validators
7. executeRoute skeleton
8. Smoke verification
9. Expression resolver
10. Selector resolver
11. Policy evaluator
12. Intent authorization
13. Transaction plan builder
```

Future work requires explicit instruction.

Do not drift into framework work.

Do not jump to plugins.

Do not add future features without an explicit milestone request.

---

## 13. Required Files for @meta-fcis/core

Create exactly these files for Milestone 0, Milestone 2, Milestone 3, Milestone 4, Milestone 5, and Milestone 6:

```txt
packages/core/package.json
packages/core/tsconfig.json
packages/core/scripts/smoke.mjs
packages/core/scripts/expression-smoke.mjs
packages/core/scripts/selector-smoke.mjs
packages/core/scripts/policy-smoke.mjs
packages/core/scripts/intent-smoke.mjs
packages/core/scripts/transaction-smoke.mjs
packages/core/src/index.ts
packages/core/src/protocol/actor.ts
packages/core/src/protocol/context.ts
packages/core/src/protocol/intent.ts
packages/core/src/protocol/request.ts
packages/core/src/protocol/response.ts
packages/core/src/graph/types.ts
packages/core/src/graph/validateGraph.ts
packages/core/src/adapters/types.ts
packages/core/src/errors/RuntimeError.ts
packages/core/src/pipeline/executeRoute.ts
packages/core/src/pipeline/validateIntentSet.ts
packages/core/src/expressions/types.ts
packages/core/src/expressions/resolvePath.ts
packages/core/src/expressions/resolveExpression.ts
packages/core/src/selectors/types.ts
packages/core/src/selectors/resolveSelectorWhere.ts
packages/core/src/selectors/resolveDependencySelector.ts
packages/core/src/selectors/resolveDependencySelectors.ts
packages/core/src/policies/types.ts
packages/core/src/policies/evaluatePolicyExpression.ts
packages/core/src/policies/evaluatePolicy.ts
packages/core/src/intents/types.ts
packages/core/src/intents/authorizeIntent.ts
packages/core/src/intents/authorizeIntentSet.ts
packages/core/src/transactions/types.ts
packages/core/src/transactions/buildTransactionPlan.ts
```

Do not add more unless required for compilation.

---

## 14. Error Handling

Use `RuntimeError` for known core failures.

Known Milestone 0 error codes:

```txt
GRAPH_INVALID
ROUTE_NOT_FOUND
REQUEST_VALIDATION_FAILED
AUTHENTICATION_FAILED
DEPENDENCY_LOAD_FAILED
PURE_FUNCTION_FAILED
CORE_OUTPUT_INVALID
INTERNAL_ERROR
```

Do not throw plain `Error` for known pipeline failures.

Do not return error objects from `executeRoute`.

Throw `RuntimeError`.

Transport plugins later convert errors to HTTP responses.

---

## 15. Acceptance Criteria

Milestone 0 is done only when:

```txt
[ ] repo has AGENTS.md
[ ] repo has strict .gitignore
[ ] repo has pnpm workspace
[ ] packages/core exists
[ ] @meta-fcis/core has no runtime dependencies
[ ] @meta-fcis/core compiles
[ ] pnpm build passes
[ ] pnpm typecheck passes
[ ] public API exports from src/index.ts
[ ] executeRoute exists
[ ] validateGraph exists
[ ] validateIntentSet exists
[ ] RuntimeError exists
[ ] no framework packages added
[ ] no plugin packages added
[ ] no SQL/auth/HTTP implementation added
```

---

## 16. Failure Conditions

The implementation is wrong if any of these happen:

```txt
[ ] Elysia is installed
[ ] Effect is installed
[ ] TypeSpec is installed
[ ] Eden is installed
[ ] Zod is installed
[ ] SQL/ORM package is installed
[ ] HTTP server is implemented
[ ] shell package is created
[ ] plugin package is created
[ ] core imports from shell
[ ] core imports from plugin
[ ] core executes intents
[ ] executeRoute wires policy evaluation without an explicit milestone
[ ] core executes transactions
[ ] core generates app-graph.json
[ ] core compiles TypeSpec
```

Stop immediately if tempted to do any of these.

Ask before proceeding.

---

## 17. Caveman Summary

Core owns graph semantics.

Core owns expression semantics.

Core owns selector semantics.

Core owns policy semantics.

Core owns intent authorization semantics.

Core owns transaction plan semantics.

Core does not execute transactions.

Core does not know frameworks.

Core does not know database.

Core does not know HTTP.

Core does not know TypeSpec.

Core does not know Elysia.

Core does not know Effect.

Core does not know Eden.

Small first.

Compile first.

Commit clean.
