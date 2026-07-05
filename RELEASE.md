# Release Process

Meta-FCIS is a monorepo, but the only releasable package today is `@meta-fcis/core`.

The appropriate release model at this stage is package-scoped prereleases:

- release `@meta-fcis/core` independently
- use SemVer from `packages/core/package.json`
- create GitHub tags as `core-vX.Y.Z`
- title GitHub releases as `@meta-fcis/core vX.Y.Z`
- publish to npm only when explicitly requested

This keeps the semantic core releaseable without implying that shells, plugins, examples, or framework integrations exist.

## Before Release

Run:

```sh
pnpm build
pnpm typecheck
pnpm smoke
pnpm pack:core
```

Confirm:

- the working tree is clean
- GitHub Actions is passing on `main`
- `CHANGELOG.md` has a dated entry for the version
- `packages/core/package.json` has the intended version
- `@meta-fcis/core` still has no runtime dependencies

## GitHub Release

For `@meta-fcis/core` version `X.Y.Z`:

```sh
git tag core-vX.Y.Z
git push origin core-vX.Y.Z
gh release create core-vX.Y.Z --title "@meta-fcis/core vX.Y.Z" --notes-file CHANGELOG.md
```

Use GitHub releases as the source release record.

## npm Publishing

npm publishing is deferred until explicitly requested.

When publishing is requested, use npm provenance from CI rather than publishing manually from a local workstation.
