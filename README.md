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

## Quick Start

Install dependencies:

```shell
pnpm add @varlet/release simple-git-hooks -D
```

Add the following configuration to `package.json`:

```json
{
  "scripts": {
    "prepare": "simple-git-hooks",
    "release": "vr release",
    "changelog": "vr changelog"
  },
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint --commit-message-path $1",
    "post-merge": "pnpm exec vr lockfile-check --install"
  }
}
```

Now you can:

- Write commits following the [Conventional Commits](https://www.conventionalcommits.org/) format, `commit-lint` will automatically validate them.
- After pulling or merging code, `lockfile-check` will automatically detect lockfile changes (`pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`) and reinstall dependencies.
- Run `pnpm release` to start the interactive release workflow.

## Usage

### Features Overview

- [release](#release) - Automatically complete the standard workflow from version modification to publishing and creating git tags.
- [publish](#publish) - Execute the npm publish process independently, usually suitable for CI/CD environments.
- [changelog](#changelog) - Automatically generate formatted changelogs based on Git Commit conventions.
- [commit-lint](#commit-lint) - Validate whether the Git Commit Message adheres to specifications, helping teams unify commit formats.
- [lockfile-check](#lockfile-check) - Check the status of the project's lockfile and provide dependency update mechanisms when changes occur.

---

### release

**Description**: The core functional collection for package release, integrating all release preparation and subsequent operations.

**Use cases**: Used when a new version needs to be released and all workspace changes have been committed. It guides through the publication via an intuitive command-line interaction.

**Core Workflow**:

1. Interactively prompt and confirm the new version number (automatically calculate patch, minor, major upgrades).
2. Execute the user-customized `task` function (e.g., modifying files, bundling assets).
3. Automatically update the version number in the project's `package.json`.
4. Generate the `Changelog` for the corresponding version.
5. Automatically complete the Git commit and create a new version Tag.
6. Publish the updated packages to npm.

**CLI Commands**:

_Flags Reference_:

```text
Usage: vr release [flags...]

Flags:
      --remote string                 Remote repository name  # default: 'origin'
      --skip-npm-publish              Skip npm publish
      --skip-changelog                Skip generating changelog
      --skip-git-tag                  Skip git tag
      --npm-tag string                npm tag
      --check-remote-version          Check remote version
```

_Example_:

```shell
# Release all packages and execute the full workflow
pnpm exec vr release

# Skip npm publishing
pnpm exec vr release --skip-npm-publish
# Skip generating changelog
pnpm exec vr release --skip-changelog
# Check remote version, interrupt execution if the identical version already exists
pnpm exec vr release --check-remote-version

# Specify the git remote name for pushing tags (useful when multiple remotes are configured, e.g. upstream, fork)
pnpm exec vr release --remote upstream
```

**Node API**:

```typescript
import { release } from '@varlet/release'

release({
  remote?: string              // Remote repository name, defaults to 'origin'
  npmTag?: string              // NPM tag to publish, such as 'next', 'alpha'
  cwd?: string                 // Working directory, defaults to process.cwd()
  skipNpmPublish?: boolean     // Whether to skip the npm publish process
  skipChangelog?: boolean      // Whether to skip changelog generation
  skipGitTag?: boolean         // Whether to skip git tag creation
  checkRemoteVersion?: boolean // Whether to check remote version to avoid conflicts
  task?(newVersion: string, oldVersion: string): Promise<void> // Custom task executed during the release
})
```

_Example: Add custom handling logic_

```javascript
import { release } from '@varlet/release'

async function task(newVersion, oldVersion) {
  // Execute building or file writing operations here
  await doBuild()
}

release({ task })
```

---

### publish

**Description**: Publish the package independently to the npm registry.

**Use cases**: Applicable in scenarios where manual version selection, changelog generation, or git tags are not needed, often used in CI/CD pipelines to trigger automated publication based on specific processes.

**Core Workflow**: Read the version number from the current package.json and run the corresponding publish process.

**CLI Commands**:

_Flags Reference_:

```text
Usage: vr publish [flags...]

Flags:
      --check-remote-version          Check remote version
      --npm-tag string                npm tag
```

_Example_:

```shell
# Publish directly to npm
pnpm exec vr publish

# Check if the same version already exists due to network or other reasons, and abort if so
pnpm exec vr publish --check-remote-version
# Specify the npm dist-tag
pnpm exec vr publish --npm-tag alpha
```

**Node API**:

```typescript
import { publish } from '@varlet/release'

publish({
  preRelease?: boolean         // Pre-release indicator, will add the '--tag alpha' option
  checkRemoteVersion?: boolean // Check if the same version exists on the remote npm before publishing
  npmTag?: string              // NPM tag to publish
  cwd?: string                 // Working directory, defaults to process.cwd()
})
```

---

### changelog

**Description**: Automatically generate Markdown-formatted changelogs based on standard Commit history.

**Use cases**: Useful for updating the `CHANGELOG.md` file independently without triggering the full release process.

**Core Workflow**: Traverse the Git commit history and format the output classified by predefined conventional commit rules (e.g., feat, fix).

**CLI Commands**:

_Flags Reference_:

```text
Usage: vr changelog [flags...]

Flags:
      --release-count number          Release count  # default: 0
      --file string                   Changelog filename  # default: 'CHANGELOG.md'
```

_Example_:

```shell
# Generate changelogs for all history and output as CHANGELOG.md in the current directory
pnpm exec vr changelog

# Specify the generated changelog filename
pnpm exec vr changelog --file my-changelog.md
# Limit the range of release versions to generate changelogs for (0 means all)
pnpm exec vr changelog --release-count 0
```

**Node API**:

```typescript
import { changelog } from '@varlet/release'

changelog({
  cwd?: string                 // Working directory, defaults to process.cwd()
  releaseCount?: number        // Number of recent releases to include in the log, defaults to 0 (all)
  file?: string                // Output changelog filename, defaults to 'CHANGELOG.md'
  showTypes?: string[]         // Commit types to display, defaults to ['feat', 'fix', 'perf', 'revert', 'refactor']
  outputUnreleased?: boolean   // Whether to output unreleased changes
  writerOpt?: object           // Specific configuration for conventional-changelog-writer
})
```

---

### commit-lint

**Description**: Validate Git commit message formats.

**Use cases**: Used in combination with `git hooks` to enforce high-quality commit descriptions, ensuring the quality of the changelog.

**Core Workflow**: Read the commit file. If it matches the configured regex, the process continues; otherwise, it prints specific failure messages and aborts the commit.

**CLI Commands**:

_Flags Reference_:

```text
Usage: vr commit-lint [flags...]

Flags:
      --commit-message-path <string>  Git commit message path
      --commit-message-re string      Validate the regex for commit message
      --error-message string          Error message displayed on validation failure
      --warning-message string        Warning message displayed on validation failure
```

_Example_:

```shell
# Check if the commit message at the given path is standard
pnpm exec vr commit-lint --commit-message-path .git/COMMIT_EDITMSG

# Customize regex validation and prompt message
pnpm exec vr commit-lint --commit-message-path .git/COMMIT_EDITMSG --commit-message-re "^feat: .*" --error-message "Commit validation failed"
```

_It is recommended to integrate with `simple-git-hooks` or `husky` in `package.json`:_

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint --commit-message-path $1"
  }
}
```

**Node API**:

```typescript
import { commitLint } from '@varlet/release'

commitLint({
  commitMessagePath: string            // Required: Path to Git commit message file
  commitMessageRe?: string | RegExp    // Regex to validate the commit message format
  errorMessage?: string                // Error message printed upon failure
  warningMessage?: string              // Supplemental warning information printed upon failure
})
```

---

### lockfile-check

**Description**: Detect and visually output in the console whether the lockfile of frontend dependencies has been modified.

**Use cases**: Recommended to use after Git operations such as pulling updates (`git pull`), switching branches (`git checkout`), or merging code. It helps detect if upstream dependency lockfiles (like `pnpm-lock.yaml`) have changed. If a change is detected, you can invoke a package manager's installation command through specific options to synchronize the local environment with upstream instantly, preventing obscure bugs caused by outdated dependencies.

**Core Workflow**: Execute a Git diff comparing the project's lockfile (e.g. `pnpm-lock.yaml` or corresponding environment lockfile) from the original HEAD. Print its modification status in the console. Furthermore, trigger the package manager to reinstall dependencies to sync with upstream if directed by the command options.

**CLI Commands**:

_Flags Reference_:

```text
Usage: vr lockfile-check [flags...]

Flags:
      --package-manager string        Package manager (npm, yarn, pnpm)  # default: 'pnpm'
      --install                       Auto install dependencies if lockfile changed
```

_Example_:

```shell
# Check the synchronization status of the current lockfile
pnpm exec vr lockfile-check

# Check current status, forcefully run installation to sync dependencies if updates exist
pnpm exec vr lockfile-check --install

# Specify other package managers for checking
pnpm exec vr lockfile-check --package-manager npm
```

_It is also recommended to integrate with `simple-git-hooks` or `husky` in `package.json` (e.g. trigger checks and installations automatically during the `post-merge` or `post-checkout` hooks):_

```json
{
  "simple-git-hooks": {
    "post-merge": "pnpm exec vr lockfile-check --install"
  }
}
```

**Node API**:

```typescript
import { lockfileCheck } from '@varlet/release'

lockfileCheck({
  packageManager?: 'npm' | 'yarn' | 'pnpm' // Choose package manager, defaults to 'pnpm'
  install?: boolean                        // Whether to automatically run install if lockfile is out of sync
})
```

## License

[MIT](https://github.com/varletjs/release/blob/main/LICENSE)
