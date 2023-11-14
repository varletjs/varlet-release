<h1 align="center">@varlet/release</h1>

<p align="center">
  <span>中文</span> | 
  <a href="https://github.com/varletjs/release/blob/main/README.md">English</a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@varlet/release" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/@varlet/release" alt="NPM Version" /></a>
  <a href="https://github.com/valetjs/release/blob/master/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/varletjs/release" alt="License" /></a>
</p>

## 介绍

`@varlet/release 是一个用于发布所有包并生成变更日志的工具。

## 安装

### npm

```shell
npm install --save-dev @varlet/release
```

### yarn

```shell
yarn add @varlet/release -D
```

### pnpm

```shell
pnpm add @varlet/release -D
```

## 使用

### 使用命令

```shell
# 发布所有包并生成变更日志
npx vr release

# 指定远程仓库名称
npx vr release -r <remote>
# or
npx vr release --remote <remote>

# 仅生成变更日志
npx vr changelog

# 指定变更日志文件名
npx vr changelog -f <filename>
# or
npx vr changelog --file <filename>

```

### 配置

#### release

| 参数                 | 说明             |
| -------------------- | ---------------- |
| -r --remote <remote> | 指定远程仓库名称 |

#### changelog

| 参数                              | 说明               |
| --------------------------------- | ------------------ |
| -f --file <filename>              | 指定变更日志文件名 |
| -rc --releaseCount <releaseCount> | 发布数量           |

### 自定义处理

#### 示例

```js
import { release, changelog } from '@varlet/release'

// Do what you want to do...
release()
```

你可以传入一个 `task`，在包版本更改后，在发布之前会调用 `task`。

```js
import { release, changelog } from '@varlet/release'

async function task() {
  await doSomething1()
  await doSomething2()
}

release({ task })
```

#### 类型

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

[MIT](https://github.com/varletjs/release/blob/main/LICENSE)
