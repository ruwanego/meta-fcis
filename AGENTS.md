# AGENTS.md — Meta-FCIS Agent Instructions

Meta-FCIS is a graph-centered, plugin-driven, LLM-safe application engine.
Read this file before making any change.

```txt
app-graph.json  = application contract
@meta-fcis/core = semantic microkernel (owns meanings)
plugins         = mechanisms (adapters)
pure functions  = domain decisions (ContextBundle -> IntentSet)
```

Meta-FCIS is not a web framework and is not built around TypeSpec, Elysia,
Eden, Effect, SQL, JWT, Bun, or Node HTTP.

## 1. Source of Truth

| What | Where |
|------|-------|
| Behavior (requirements + scenarios) | `openspec/specs/<capability>/spec.md` |
| Milestone queue | `ROADMAP.md` |
| Shipped history | `CHANGELOG.md`, git history, `openspec/changes/archive/` |
| Layout, files, versions | the filesystem and `package.json`s — do not duplicate them here |

This file carries only constraints and workflow. If this file and a spec
disagree, the spec wins; fix whichever is wrong.

## 2. OpenSpec Workflow

All new work goes through an OpenSpec change:

```txt
/opsx:propose  -> proposal, design, delta specs, tasks
/opsx:apply    -> implement the tasks
/opsx:archive  -> sync delta specs into openspec/specs/ and archive
```

Rules:

- Do not implement behavior that has no approved change under `openspec/changes/`.
- Keep `openspec/specs/` in sync with shipped behavior; a merged behavior change without a spec update is a defect.
- A "next milestone" request means: propose first, get approval, then implement. Take the top unstarted `ROADMAP.md` item unless told otherwise.
- Run `openspec validate --all` after touching specs.

### Harness Bootstrap

The source of truth for every AI harness is this file plus `openspec/`.
Per-tool integration dirs (`.cursor/`, `.codex/`, `.gemini/`, ...) are
generated and gitignored; only `.claude/` is committed. After cloning:

```sh
npx @fission-ai/openspec@latest init --tools all --force   # or just the tools you use
npx gitnexus@latest analyze && npx gitnexus@latest setup
```

## 3. Workspace

pnpm workspace, root `package.json` is private and manages packages only:
`packages/core` (`@meta-fcis/core`), `packages/shell` (`@meta-fcis/shell`),
`packages/plugin-persistence-memory` (`@meta-fcis/plugin-persistence-memory`),
`packages/plugin-transport-http` (`@meta-fcis/plugin-transport-http`),
`examples/basic`. Verification is smoke scripts (`pnpm smoke`), not a test
framework. Do not invent extra packages, plugins, shells, or examples unless
explicitly requested.

## 4. Hard Boundaries

Dependency direction: `shell -> core`, `plugins -> core`, `examples -> core`,
core depends on nothing framework-specific. The core knows adapter
interfaces, never plugin internals.

`@meta-fcis/core` has ZERO runtime dependencies. Forbidden inside core:

```txt
TypeSpec, Elysia, Eden, Effect, Zod, Valibot, Express, Fastify, Hono,
SQL, Prisma, Drizzle, database clients, auth implementations, JWT/OIDC
libraries, Redis, queues, email providers, HTTP servers, Bun-specific
APIs, Node-specific APIs (fs, http, ...), decorators, code generation
```

The core pipeline never executes transactions. The shell must not serve
HTTP, open sockets, load plugins, implement auth providers, connect to
databases, or execute transactions directly (only via a caller-supplied
`TransactionExecutor`).

Pure functions receive only a `ContextBundle` (actor, data, dependencies) —
never framework contexts, raw requests, DB clients, loggers, filesystem, or
environment. Plugins are `Config -> Adapter` factories and may do effects;
pure functions may not.

Graphs may carry mechanism metadata (`table`, `transport.method`); only the
plugin owning that mechanism interprets it — core validates but never reads it.

## 5. Code Rules

- TypeScript, strict mode, ESM, NodeNext; `.js` extensions in relative imports
  (`import { X } from "../errors/RuntimeError.js"`). No CommonJS, no `require`,
  never weaken compiler settings.
- Known failures throw `RuntimeError` with a code from the closed
  `RuntimeErrorCode` union (codes are specced per capability in
  `openspec/specs/`). Never throw plain `Error` for known pipeline failures;
  never return error objects from `executeRoute`.

## 6. Git Discipline

- Work on `feat/<name>` branches; small conventional commits
  (`feat(core): ...`, `chore(repo): ...`). Plain messages, no trailers.
- Before every commit: `pnpm build && pnpm typecheck` must pass (run
  `pnpm smoke` before merging). Fix failures before committing.
- Never commit `node_modules/`, `dist/`, coverage, `.env*`, logs, or scratch files.

## 7. Failure Conditions

The implementation is wrong if any of these happen — stop and ask:

```txt
a forbidden package from section 4 is installed
an HTTP server, framework shell, or plugin package is created unrequested
core imports from shell or a plugin
core executes intents or transactions
core generates app-graph.json or compiles TypeSpec
behavior ships without an approved OpenSpec change
```

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **meta-fcis** (927 symbols, 1422 relationships, 45 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/meta-fcis/context` | Codebase overview, check index freshness |
| `gitnexus://repo/meta-fcis/clusters` | All functional areas |
| `gitnexus://repo/meta-fcis/processes` | All execution flows |
| `gitnexus://repo/meta-fcis/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
