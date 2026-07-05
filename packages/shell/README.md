# @meta-fcis/shell

Plain runtime shell boundary for Meta-FCIS core execution.

The shell owns host-level result mapping. It accepts an application graph and runtime adapters from the caller, delegates route execution to `@meta-fcis/core`, and converts thrown `RuntimeError` instances into shell result objects.

It does not serve HTTP, open sockets, connect to databases, implement auth providers, load plugins, or execute transaction plans.

## Entry Point

```ts
import { createShellRuntime } from "@meta-fcis/shell";

const runtime = createShellRuntime({ graph, adapters });
const result = await runtime.runRoute(request);
```

## Verification

From the repository root:

```sh
pnpm build
pnpm typecheck
pnpm smoke
```
