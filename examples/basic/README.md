# Basic Example

This example runs Meta-FCIS without HTTP, a database, plugins, or transaction execution.

It uses:

- an in-memory app graph
- in-memory runtime adapters
- a pure function selected by graph route metadata
- `@meta-fcis/shell` as the host boundary

Run from the repository root:

```sh
pnpm --filter @meta-fcis/example-basic start
```

The example prints the pure response payload and the transaction plan returned by core. The transaction plan is not executed.
