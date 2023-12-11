<h1 align="center">Varlet Release</h1>

<p align="center">
  <span>中文</span> | 
  <a href="https://github.com/varletjs/release/blob/main/README.md">English</a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@varlet/release" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/@varlet/release" alt="NPM Version" /></a>
  <a href="https://github.com/valetjs/release/blob/master/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/varletjs/release" alt="License" /></a>
</p>

## 介绍

`Varlet Release` 是一个用于发布所有包、生成变更日志和检测 `commit message` 的工具。

## 安装

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

## 使用

### 使用命令

```shell
# 发布所有包并生成变更日志
npx vr release

# 指定远程仓库名称
npx vr release -r https://github.com/varletjs/varlet-release
# or
npx vr release --remote https://github.com/varletjs/varlet-release

# 仅生成变更日志
npx vr changelog

# 指定变更日志文件名
npx vr changelog -f changelog.md
# or
npx vr changelog --file changelog.md

# 检测 commit message
npx vr lint-commit .git/COMMIT_EDITMSG
```

### 配置

#### release

| 参数                   | 说明             |
| ---------------------- | ---------------- |
| -r --remote \<remote\> | 指定远程仓库名称 |

#### changelog

| 参数                                | 说明               |
| ----------------------------------- | ------------------ |
| -f --file \<filename\>              | 指定变更日志文件名 |
| -rc --releaseCount \<releaseCount\> | 发布数量           |

#### lint-commit

| 参数                             | 说明                                                                        |
| -------------------------------- | --------------------------------------------------------------------------- |
| \<commitMessagePath\>            | 提交 `git message` 的临时文件路径。`git` 钩子 `commit-msg` 会传递这个参数。 |
| -cmr --commitMessageRe \<reg\>   | 验证 `commit message` 是否通过的正则                                        |
| -em --errorMessage \<message\>   | 验证失败展示的错误信息                                                      |
| -wm --warningMessage \<message\> | 验证失败展示的提示信息                                                      |

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
function commitLint(commitMessagePath: string): void
```

## License

[MIT](https://github.com/varletjs/release/blob/main/LICENSE)
