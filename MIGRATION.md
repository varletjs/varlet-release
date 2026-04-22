# Migrating from v1 to v2

This guide is for users upgrading from `v1.x` to the current latest `v2.2.1`.

Scope:

- Baseline comparison: `v1.2.0 -> v2.2.1`

## Migration Overview

Most core `release` and `publish` workflows remain compatible in `v2`. The migration work is mainly around:

1. `CLI` flag changes
2. `commit-lint` argument changes
3. `changelog` Node API and output behavior changes

There is no new runtime migration cost compared with `v1`:

- `v1` was already pure `ESM`
- `v2` still requires `Node.js ^20.19.0 || >=22.12.0`

## Required changes

### 1. `commit-lint` removed `--commitMessagePath (-p)` and now accepts the file path directly

`v1`:

```bash
vr commit-lint -p .git/COMMIT_EDITMSG
```

`v2`:

```bash
vr commit-lint .git/COMMIT_EDITMSG
```

If your `simple-git-hooks`, `husky`, or custom scripts still pass `-p` / `--commitMessagePath`, replace them with the direct file path.

Recommended:

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint $1"
  }
}
```

### 2. `changelog` no longer supports `preset`

In `v1`, `changelog` supported:

- CLI: `--preset`
- Node API: `preset`

In `v2`, that customization path is removed. The final implementation uses the current built-in changelog generation strategy.

If you have calls like these, remove them:

```bash
vr changelog --preset angular
```

```ts
changelog({
  preset: 'angular',
})
```

### 3. `writerOpts` was renamed to `writerOpt`

`v1`:

```ts
changelog({
  writerOpts: {
    /* ... */
  },
})
```

`v2`:

```ts
changelog({
  writerOpt: {
    /* ... */
  },
})
```

If you customize changelog output, update this option name.

## Compatibility items to review

### Some short CLI flags changed

Long flags are mostly similar, but several short flags changed or were removed:

| Command       | v1                        | v2                   |
| ------------- | ------------------------- | -------------------- |
| `release`     | `-nt, --npm-tag`          | `-t, --npm-tag`      |
| `release`     | `-sc, --skip-changelog`   | `--skip-changelog`   |
| `release`     | `-sgt, --skip-git-tag`    | `--skip-git-tag`     |
| `changelog`   | `-rc, --releaseCount`     | `-c, --releaseCount` |
| `commit-lint` | `-p, --commitMessagePath` | positional parameter |

If your CI, scripts, or Git hooks use the old short flags, update them.

### `changelog` output can differ in details

The `changelog` feature remains, but `v2` finalized a new generation implementation. After upgrading, watch for:

- Group titles may differ, for example `Code Refactoring` became `Refactoring`
- `preset`-based output switching is gone
- New options were added: `showTypes`, `outputUnreleased`, and `cwd`

If your project:

- parses `CHANGELOG.md`
- depends on exact section titles
- post-processes changelog templates

regenerate the changelog once and compare the output.

## Node API mapping

### `changelog`

`v1`:

```ts
changelog({
  file?: string
  releaseCount?: number
  preset?: string
  writerOpts?: object
})
```

`v2`:

```ts
changelog({
  cwd?: string
  releaseCount?: number
  file?: string
  showTypes?: string[]
  outputUnreleased?: boolean
  writerOpt?: object
})
```

Migration guidance:

- remove `preset`
- rename `writerOpts` to `writerOpt`
- if you previously used `preset` to switch output style, move that compatibility into `writerOpt` or downstream processing

### `release` / `publish`

These APIs were mainly enhanced in `v2`, not broken:

- `release` adds `cwd`
- `publish` adds `cwd`

Most existing `v1` calls should continue to work unchanged.

## New but non-breaking additions

These were added in `v2` and are optional:

- `lockfile-check` CLI command
- `lockfileCheck` Node API export
- `changelog({ outputUnreleased: true })`

Example:

```json
{
  "simple-git-hooks": {
    "post-merge": "pnpm exec vr lockfile-check"
  }
}
```

## Recommended upgrade steps

1. Upgrade `@varlet/release` to the latest `v2`
2. Search and replace old usages
3. Run local checks for `release`, `changelog`, and `commit-lint`
4. Review Git hooks, CI jobs, and custom scripts

Recommended search terms:

- `commitMessagePath`
- `--preset`
- `writerOpts`
- `-nt`
- `-rc`
- `-sc`
- `-sgt`

## Drop-in replacements

### Git hook

`v1`:

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint -p $1"
  }
}
```

`v2`:

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint $1",
    "post-merge": "pnpm exec vr lockfile-check"
  }
}
```

### Changelog API

`v1`:

```ts
import { changelog } from '@varlet/release'

await changelog({
  releaseCount: 0,
  preset: 'angular',
  writerOpts: {},
})
```

`v2`:

```ts
import { changelog } from '@varlet/release'

await changelog({
  releaseCount: 0,
  writerOpt: {},
})
```
