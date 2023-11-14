<h1 align="center">Varlet Release</h1>

<p align="center">
  <span>English</span> | 
  <a href="https://github.com/varletjs/release/blob/main/README.zh-CN.md">中文</a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@varlet/release" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/@varlet/release" alt="NPM Version" /></a>
  <a href="https://github.com/varletjs/release/blob/main/LICENCE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/varletjs/release" alt="License" /></a>
</p>

## Intro

`Varlet Release` is a tool to release all packages and generate changelogs.

## Installation

### npm

```shell
npm i @varlet/release -D
```

### yarn

```shell
yarn add @varlet/release -D
```

### pnpm

```shell
pnpm add @varlet/release -D
```

## Usage

### Using Command

```shell
# Release all packages and generate changelogs
npx vr release

# Specify remote name
npx vr release -r <remote>
# or
npx vr release --remote <remote>

# Just generate changelogs
npx vr changelog

# Specify changelog filename
npx vr changelog -f <filename>
# or
npx vr changelog --file <filename>

```

### Configuration

#### release

| Params               | Instructions        |
| -------------------- | ------------------- |
| -r --remote <remote> | Specify remote name |

#### changelog

| Params                            | Instructions               |
| --------------------------------- | -------------------------- |
| -f --file <filename>              | Specify changelog filename |
| -rc --releaseCount <releaseCount> | Release count              |

### Custom Handle

#### Example

```js
import { release, changelog } from '@varlet/release'

// Do what you want to do...
release()
```

You can pass in a task that will be called before the publish after the package version is changed.

```js
import { release, changelog } from '@varlet/release'

async function task() {
  await doSomething1()
  await doSomething2()
}

release({ task })
```

#### Types

```ts
interface ReleaseCommandOptions {
  remote?: string
  task?(): Promise<void>
}
function release(options: ReleaseCommandOptions): Promise<void>

interface ChangelogCommandOptions {
  file?: string
  releaseCount?: number
}
function changelog({ releaseCount, file }?: ChangelogCommandOptions): Promise<void>
```

## License

[MIT](https://github.com/varletjs/release/blob/main/LICENCE)
