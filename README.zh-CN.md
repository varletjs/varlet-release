<h1 align="center">Varlet Release</h1>

<p align="center">
  <span>中文</span> | 
  <a href="https://github.com/varletjs/release/blob/main/README.md">English</a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@varlet/release" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/npm/v/@varlet/release" alt="NPM Version" /></a>
  <a href="https://github.com/varletjs/release/blob/main/LICENSE" target="_blank" rel="noopener noreferrer"><img src="https://badgen.net/github/license/varletjs/release" alt="License" /></a>
</p>

## 介绍

`Varlet Release` 是一个用于发布所有包、生成变更日志和检测 `commit message` 的辅助工具，依赖于 `pnpm`。

- 📦 **开箱即用**：零配置的极简发布体验
- 🤖 **直观交互**：提供非常友好的交互式终端提示
- 🛠 **规范驱动**：自动校验 Git Commit 并生成标准 Changelog
- 🔗 **深度扩展**：支持命令行调用与 Node.js API 无缝扩展

> `Varlet Release` 需要 `Node.js` ^20.19.0 || >=22.12.0，并且仅支持 `esm`。

## 快速开始

安装依赖：

```shell
pnpm add @varlet/release simple-git-hooks -D
```

在 `package.json` 中添加以下配置：

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

现在你可以：

- 按照 [Conventional Commits](https://www.conventionalcommits.org/) 规范编写提交信息，`commit-lint` 会自动校验。
- 拉取或合并代码后，`lockfile-check` 会自动检测 lockfile 变化（`pnpm-lock.yaml`、`yarn.lock`、`package-lock.json`）并重新安装依赖。
- 运行 `pnpm release` 启动交互式发布流程。

## 使用

### 功能概览

- [release](#release) - 自动完成从版本号变更到发布、打标签的标准工作流。
- [publish](#publish) - 单独执行 npm 发布流程，通常适用于 CI/CD 环境。
- [changelog](#changelog) - 根据 Git Commit 规范自动生成格式化的变更日志。
- [commit-lint](#commit-lint) - 校验 Git Commit Message 是否符合规范，帮助团队统一提交格式。
- [lockfile-check](#lockfile-check) - 检查项目 lockfile 状态并在变化时提供更新依赖机制。

---

### release

**作用**：包版本发布的核心功能集合，集成和串联了所有的发布准备及后续操作。

**使用场景**：在项目需要发布新版本且工作区变更已全部提交时使用。通过直观的命令行交互完成发布。

**核心流程**：

1. 交互式提示并确认发布版本号（自动计算 patch、minor 等升级维度）。
2. 执行用户自定义的 `task` 函数（例如修改文件，打包构建）。
3. 自动更新项目中 `package.json` 的版本号。
4. 生成对应该版本的 `Changelog`。
5. 自动完成 Git 提交动作并且打上新版本标签 (Tag)。
6. 自动将更新后的包发布至 npm。

**CMD 命令**：

_标志参考_：

```text
用法: vr release [标志...]

标志:
      --remote string                 远程仓库名称  # 默认: 'origin'
      --skip-npm-publish              跳过 npm 发布
      --skip-changelog                跳过生成变更日志
      --skip-git-tag                  跳过 git tag
      --npm-tag string                npm tag
      --check-remote-version          检查远程版本
```

_使用示例_：

```shell
# 发布所有包并执行完整工作流程
pnpm exec vr release

# 跳过 npm 发布
pnpm exec vr release --skip-npm-publish
# 跳过生成变更日志
pnpm exec vr release --skip-changelog
# 检查远程版本，若已存在相同版本则中断执行
pnpm exec vr release --check-remote-version

# 指定推送 tag 的 git remote 名称（适用于配置了多个 remote 的场景，如 upstream、fork 等）
pnpm exec vr release --remote upstream
```

**Node 调用**：

```typescript
import { release } from '@varlet/release'

release({
  remote?: string              // 远程仓库名称，默认为 'origin'
  npmTag?: string              // 发布的 npm tag，如 'next'、'alpha'
  cwd?: string                 // 工作目录，默认为 process.cwd()
  skipNpmPublish?: boolean     // 是否跳过 npm publish 过程
  skipChangelog?: boolean      // 是否跳过生成变更日志
  skipGitTag?: boolean         // 是否跳过构建 git tag 过程
  checkRemoteVersion?: boolean // 是否检查远程版本，保证不发生版本冲突
  task?(newVersion: string, oldVersion: string): Promise<void> // 发布过程中执行的自定义任务
})
```

_例：增加自定义处理逻辑_

```javascript
import { release } from '@varlet/release'

async function task(newVersion, oldVersion) {
  // 在此处执行构建或写入文件的操作
  await doBuild()
}

release({ task })
```

---

### publish

**作用**：单独将包发布至 npm 仓库。

**使用场景**：适用于无需手动选择版本、生成 Changelog 或打 Git Tag 的场景，常用于在 CI/CD 流水线中针对特定过程触发自动化发布。

**核心流程**：读取当前 package.json 中的版本号，运行对应的 publish 流程。

**CMD 命令**：

_标志参考_：

```text
用法: vr publish [标志...]

标志:
      --check-remote-version          检查远程版本
      --npm-tag string                npm tag
```

_使用示例_：

```shell
# 直接发布到 npm
pnpm exec vr publish

# 检查由于网络等原因是否已存在相同版本，存在则放弃发布
pnpm exec vr publish --check-remote-version
# 指定 npm 的 dist-tag
pnpm exec vr publish --npm-tag alpha
```

**Node 调用**：

```typescript
import { publish } from '@varlet/release'

publish({
  preRelease?: boolean         // 预发布标示，将添加 '--tag alpha' 选项
  checkRemoteVersion?: boolean // 发布前检查远程 npm 上是否已存在相同版本
  npmTag?: string              // 发布的 npm tag
  cwd?: string                 // 工作目录，默认为 process.cwd()
})
```

---

### changelog

**作用**：基于规范的 Commit 历史自动生成 Markdown 格式的变更日志。

**使用场景**：单独更新 `CHANGELOG.md` 记录，单点生成所需日志。

**核心流程**：遍历 Git 提交历史，依据预设的 conventional commit 规则分类（如 feat、fix 等），格式化输出。

**CMD 命令**：

_标志参考_：

```text
用法: vr changelog [标志...]

标志:
      --release-count number          发布数量  # 默认: 0
      --file string                   变更日志文件名  # 默认: 'CHANGELOG.md'
```

_使用示例_：

```shell
# 生成所有历史的变更日志并在当前目录输出为 CHANGELOG.md
pnpm exec vr changelog

# 指定生成的变更日志文件名
pnpm exec vr changelog --file my-changelog.md
# 限定发布版本的范围数量以生成变更日志 (0 为全量)
pnpm exec vr changelog --release-count 0
```

**Node 调用**：

```typescript
import { changelog } from '@varlet/release'

changelog({
  cwd?: string                 // 工作目录，默认为 process.cwd()
  releaseCount?: number        // 输出日志涉及的最近发布的版本数量，默认为 0（全部）
  file?: string                // 输出的日志文件名，默认为 'CHANGELOG.md'
  showTypes?: string[]         // 显示的 commit 类型，默认 ['feat', 'fix', 'perf', 'revert', 'refactor']
  outputUnreleased?: boolean   // 是否输出 unreleased 版本变更
  writerOpt?: object           // conventional-changelog-writer 具体配置参数
})
```

---

### commit-lint

**作用**：校验 Git 提交信息格式。

**使用场景**：结合 `git hooks` 一同工作，强制保障书写高质量的提交说明以保证 Changelog 质量。

**核心流程**：读取提交文件，若是符合配置的正则格式则通过处理，否则打印具体的失败信息报错，并终止提交。

**CMD 命令**：

_标志参考_：

```text
用法: vr commit-lint [标志...]

标志:
      --commit-message-path <string>  Git commit message 路径
      --commit-message-re string      验证 commit message 是否通过的正则表达式
      --error-message string          验证失败时显示的错误信息
      --warning-message string        验证失败时显示的警告信息
```

_使用示例_：

```shell
# 检测指路径的 commit message 是否符合规范
pnpm exec vr commit-lint --commit-message-path .git/COMMIT_EDITMSG

# 定制指定的校验正则表达式和提示信息
pnpm exec vr commit-lint --commit-message-path .git/COMMIT_EDITMSG --commit-message-re "^feat: .*" --error-message "提交校验失败"
```

_建议配合并在 `package.json` 中的 `simple-git-hooks` 或 `husky` 一同集成运作：_

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint --commit-message-path $1"
  }
}
```

**Node 调用**：

```typescript
import { commitLint } from '@varlet/release'

commitLint({
  commitMessagePath: string            // 必选：Git commit message 文件路径
  commitMessageRe?: string | RegExp    // 验证 msg 格式的正则表达式
  errorMessage?: string                // 验证失败时打印的提示文本
  warningMessage?: string              // 验证失败时打印的补充警告文档链接
})
```

---

### lockfile-check

**作用**：检测并在控制台直观地输出前端依赖包的 lockfile 文件是否发生变更。

**使用场景**：通常在进行 `git 操作` (如 `git pull`拉取最新代码、`git checkout`切换分支、或合并代码) 之后使用。它能帮助你检测上游的依赖锁文件（如 `pnpm-lock.yaml`）是否发生了变动。如果检测到有变更，可以通过可选操作直接执行 install 安装命令，从而确保本地环境快速与上游依赖保持一致，避免因依赖版本陈旧导致的疑难 bug。

**核心流程**：比对项目原始游标的锁文件（如 pnpm-lock.yaml 或对应环境的 lockfile）的 Git diff，在控制台输出其是否存在变动；并根据指令决定是否随后触发包管理器的依赖重装程序以同步上游。

**CMD 命令**：

_标志参考_：

```text
用法: vr lockfile-check [标志...]

标志:
      --package-manager string        包管理器 (npm, yarn, pnpm)  # 默认: 'pnpm'
      --install                       如果 lockfile 发生变化则自动安装依赖
```

_使用示例_：

```shell
# 检查当前 lockfile 的同步状态
pnpm exec vr lockfile-check

# 检查当前状态，若存在更新则强制运行安装命令同步依赖
pnpm exec vr lockfile-check --install

# 指定其他包管理器进行检查
pnpm exec vr lockfile-check --package-manager npm
```

_建议配合并在 `package.json` 中的 `simple-git-hooks` 或 `husky` 一同集成运作（例如在拉取代码的 `post-merge` 或 `post-checkout` 阶段自动触发检查与安装）：_

```json
{
  "simple-git-hooks": {
    "post-merge": "pnpm exec vr lockfile-check --install"
  }
}
```

**Node 调用**：

```typescript
import { lockfileCheck } from '@varlet/release'

lockfileCheck({
  packageManager?: 'npm' | 'yarn' | 'pnpm' // 选择包管理器，默认为 'pnpm'
  install?: boolean                        // 检测到 lock 不同步时是否自动运行对应的 install 重新安装
})
```

## 许可证

[MIT](https://github.com/varletjs/release/blob/main/LICENSE)
