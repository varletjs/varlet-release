<h1 align="center">Varlet Release</h1>

<p align="center">
  <span>English</span> | 
  <a href="https://github.com/varletjs/release/blob/main/README.zh-CN.md">中文</a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@varlet/release" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/@varlet/release" alt="NPM Version" /></a>
  <a href="https://github.com/varletjs/release/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/varletjs/release" alt="License" /></a>
</p>

## Intro

`Varlet Release` is a tool used for publishing all packages, generating change logs, and checking `commit messages`, relying on `pnpm`.

- 📦 **Out of the box**: Zero-configuration release experience
- 🤖 **Interactive CLI**: Friendly interactive terminal prompts
- 🛠 **Standardization**: Validates Git Commit messages and generates standard changelogs
- 🔗 **Extensibility**: Supports both CLI commands and Node.js API for deep customization

> `Varlet Release` requires `Node.js` ^20.19.0 || >=22.12.0 and `esm` only.

## Installation

```shell
pnpm add @varlet/release -D
```

## Usage

### Core Workflow

When executing `vr release`, the following sequence of lifecycles occurs automatically:

1. Select/Confirm the **version** to publish interactively
2. Execute the user-defined `task` function (optional, e.g., to rebuild projects based on the new version)
3. Update the `package.json` **version** programmatically
4. Generate the **Changelog**
5. **Git Commit** & **Git Tag**
6. **Publish** to npm

### Using Command

```shell
# Release all packages and run the full workflow
npx vr release

# Specify remote name
npx vr release -r origin
# or
npx vr release --remote origin

# Just generate changelogs
npx vr changelog

# Specify changelog filename
npx vr changelog -f changelog.md
# or
npx vr changelog --file changelog.md

# Lint commit message
npx vr commit-lint -p .git/COMMIT_EDITMSG

# Publish to npm, which can be called in the ci environment
npx vr publish

# Check if lockfile has been updated
npx vr lockfile-sync-check

# Auto install dependencies if lockfile changed
npx vr lockfile-sync-check -i
```

### Git Hooks Integration (Best Practice)

It is highly recommended to use `commit-lint` with `simple-git-hooks` or `husky` in `package.json` to automatically check developers' commit messages before committing:

```json
{
  "simple-git-hooks": {
    "commit-msg": "npx vr commit-lint -p $1"
  }
}
```

### Configuration

#### release

```
Usage: vr release [flags...]

Flags:
  -r, --remote <string>             Remote name
  -s, --skip-npm-publish            Skip npm publish
      --skip-changelog              Skip generate changelog
      --skip-git-tag                Skip git tag
  -t, --npm-tag <string>            Npm tag
  -c, --check-remote-version        Check remote version
```

#### publish

```
Usage: vr publish [flags...]

Flags:
  -c, --check-remote-version        Check remote version
  -t, --npm-tag <string>            Npm tag
```

#### changelog

```
Usage: vr changelog [flags...]

Flags:
  -c, --release-count <number>      Release count, default 0
  -f, --file <string>               Changelog filename
```

#### commit-lint

```
Usage: vr commit-lint [flags...]

Flags:
  -p, --commit-message-path <string>  Git commit message path
  -r, --commit-message-re <string>    Validate the regular of whether the commit message passes
  -e, --error-message <string>        Validation failed to display error messages
  -w, --warning-message <string>      Validation failed to display warning messages
```

#### lockfile-sync-check

```
Usage: vr lockfile-sync-check [flags...]

Flags:
  -m, --package-manager <string>    Package manager (npm, yarn, pnpm), default pnpm
  -i, --install                     Auto install dependencies if lockfile changed
```

### Node API Custom Handle

You can write your own release scripts with Internal Node.js API instead of CLI.

#### Example

```js
import { changelog, release } from '@varlet/release'

// Run the core release workflow directly
release()
```

You can pass in a custom `task` function that will be called after the package version is updated but before the remaining publish steps.

```js
import { changelog, release } from '@varlet/release'

async function task(newVersion, oldVersion) {
  await doSomething1()
  await doSomething2()
}

release({ task })
```

## License

[MIT](https://github.com/varletjs/release/blob/main/LICENSE)
