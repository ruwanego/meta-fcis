# Release Process

Meta-FCIS is a monorepo. The releasable packages today are:

- `@meta-fcis/core`
- `@meta-fcis/shell`

The appropriate release model at this stage is package-scoped prereleases:

- release packages independently
- use SemVer from each package's `package.json`
- create GitHub tags as `<package>-vX.Y.Z`, such as `core-vX.Y.Z` or `shell-vX.Y.Z`
- title GitHub releases as `@meta-fcis/<package> vX.Y.Z`
- publish to npm only when explicitly requested

This keeps each package releaseable without implying that plugins, examples, HTTP servers, or framework integrations exist.

## Before Release

Run:

```sh
pnpm build
pnpm typecheck
pnpm smoke
pnpm pack:core
pnpm pack:shell
```

Confirm:

- the working tree is clean
- GitHub Actions is passing on `main`
- `CHANGELOG.md` has a dated entry for the version
- the relevant package `package.json` has the intended version
- `@meta-fcis/core` still has no runtime dependencies

## GitHub Release

For `@meta-fcis/core` version `X.Y.Z`:

```sh
git tag core-vX.Y.Z
git push origin core-vX.Y.Z
gh release create core-vX.Y.Z --title "@meta-fcis/core vX.Y.Z" --notes-file CHANGELOG.md
```

Use GitHub releases as the source release record.

For `@meta-fcis/shell` version `X.Y.Z`, use the same pattern with `shell-vX.Y.Z`.

## npm Publishing

npm publishing is deferred until explicitly requested.

When publishing is requested, use npm provenance from CI rather than publishing manually from a local workstation.
