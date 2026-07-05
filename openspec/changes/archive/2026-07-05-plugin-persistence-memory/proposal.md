# Proposal: plugin-persistence-memory

## Why

Every adapter in the system is still a hand-written fake — nothing actually implements the persistence contract or executes plans against a real store. The plugin model ("plugins own mechanisms") has never been exercised, so its ergonomics are unproven. This milestone ships the first real plugin package and makes the basic example run on it end to end.

## What Changes

- New package `@meta-fcis/plugin-persistence-memory` (`packages/plugin-persistence-memory`): a plugin factory that takes a validated graph plus optional seed data and returns a `PersistenceAdapter` and a `TransactionExecutor` backed by one shared in-memory store.
- The persistence adapter implements resolved-selector semantics honestly: equality `where` matching, `cardinality` one/many, `project` field picking, `limit`, `orderBy` (multi-key asc/desc), and `onMissing` (null/empty/error).
- The transaction executor applies CREATE (id generation), UPDATE (merge), DELETE (remove) atomically — all operations commit or none do — and reports generated ids in the execution result.
- `examples/basic` drops its fake persistence adapter and executor in favor of the plugin.
- Core and shell are unchanged (no new types, no new error codes).

## Capabilities

### New Capabilities

- `plugin-persistence-memory`: the plugin factory contract, store seeding, selector query semantics, executor semantics, and atomic commit behavior.

### Modified Capabilities

- `basic-example`: the "In-memory demonstration" requirement changes from hand-written fake persistence/executor to the real plugin package (schema/auth/pureInvoker fakes remain).

## Impact

- Code: new `packages/plugin-persistence-memory/` (package.json, tsconfig, src, smoke script), `examples/basic` (swap fakes, add dependency), root smoke chain, pnpm workspace (already globs `packages/*`).
- API: new package with public factory export. Core/shell public APIs untouched.
- Dependencies: the plugin depends only on `@meta-fcis/core` (types). No third-party runtime dependencies.
- Docs: AGENTS.md workspace line, README, CHANGELOG, ROADMAP.

## Non-goals

- No durability: memory only, no files, no database, no SQL. This plugin is the reference mechanism and a test double for real apps — a database plugin is a separate future milestone.
- No soft-delete semantics: `deletePolicy: "soft"` entities are deleted like `hard` for now (authorization already blocks `forbidden`); soft-delete storage behavior is unspecified engine-wide and out of scope.
- No richer queries: equality-only `where` (no operators, ranges, or joins), matching what selector resolution can produce today.
- No rollback contract changes in core: atomicity here is a property of this plugin's implementation, not a new engine guarantee.
- No HTTP, auth, or schema plugins — those are M14+.
