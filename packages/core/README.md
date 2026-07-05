# @meta-fcis/core

Runtime-agnostic semantic core for Meta-FCIS application graphs.

The core validates graph contracts, resolves expressions and dependency selectors, evaluates policies, authorizes intents, and builds transaction plans. It does not execute transactions, serve HTTP, connect to databases, or implement plugins.

## Entry Point

```ts
import {
  executeRoute,
  validateGraph,
  validateIntentSet,
  RuntimeError,
} from "@meta-fcis/core";
```

## Verification

From the repository root:

```sh
pnpm build
pnpm typecheck
pnpm smoke
```

## Status

Current semantic implementation is complete through Milestone 8. Future milestones require explicit request before implementation.

This package is licensed under MIT.
