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

## 安装

```shell
pnpm add @varlet/release -D
```

## 使用

### 核心工作流

执行 `vr release` 时，背后会自动完成以下流程（保障每一步的严谨性）：

1. 交互式选择/确认要发布的版本号
2. 执行用户自定义的额外 `task` 操作（可选，如重新构建以注入新版本号）
3. 自动修改工程中的版本号信息
4. 自动生成符合规范的 Changelog
5. Git 提交 (Commit) 与打标签 (Tag)
6. 发布至 npm

### 命令行使用

```shell
# 发布所有包并执行完整工作流程
npx vr release

# 指定远程仓库名称
npx vr release -r origin
# 或
npx vr release --remote origin

# 仅生成变更日志
npx vr changelog

# 指定变更日志文件名
npx vr changelog -f changelog.md
# 或
npx vr changelog --file changelog.md

# 检测 commit message 是否符合规范
npx vr commit-lint -p .git/COMMIT_EDITMSG

# 发布到 npm（通常在 CI/CD 中执行）
npx vr publish

# 检查 lockfile 是否已更新
npx vr lockfile-sync-check

# 如果 lockfile 发生变化则自动安装依赖
npx vr lockfile-sync-check -i
```

### Git Hooks 集成 (推荐最佳实践)

建议在 `package.json` 中配合 `simple-git-hooks` 或 `husky` 使用 `commit-lint`，在开发者提交代码时自动触发校验：

```json
{
  "simple-git-hooks": {
    "commit-msg": "npx vr commit-lint -p $1"
  }
}
```

### 配置参考

#### release

```
用法: vr release [标志...]

标志:
  -r, --remote <string>             远程仓库名称
  -s, --skip-npm-publish            跳过 npm 发布
      --skip-changelog              跳过生成变更日志
      --skip-git-tag                跳过 git tag
  -t, --npm-tag <string>            npm tag
  -c, --check-remote-version        检查远程版本
```

#### publish

```
用法: vr publish [标志...]

标志:
  -c, --check-remote-version        检查远程版本
  -t, --npm-tag <string>            npm tag
```

#### changelog

```
用法: vr changelog [标志...]

标志:
  -c, --release-count <number>      发布数量，默认 0
  -f, --file <string>               变更日志文件名
```

#### commit-lint

```
用法: vr commit-lint [标志...]

标志:
  -p, --commit-message-path <string>  Git commit message 路径
  -r, --commit-message-re <string>    验证 commit message 是否通过的正则表达式
  -e, --error-message <string>        验证失败时显示的错误信息
  -w, --warning-message <string>      验证失败时显示的警告信息
```

#### lockfile-sync-check

```
用法: vr lockfile-sync-check [标志...]

标志:
  -m, --package-manager <string>    包管理器 (npm, yarn, pnpm)，默认 pnpm
  -i, --install                     如果 lockfile 发生变化则自动安装依赖
```

### Node API 自定义处理

除了命令行，你也可以使用 Node.js API 结合内部逻辑编写发布脚本。

#### 示例代码

```js
import { changelog, release } from '@varlet/release'

// 执行默认发布流程
release()
```

你可以传入一个 `task` 函数，在版本号变更之后、发布到 npm 等后续操作之前被调用。

```js
import { changelog, release } from '@varlet/release'

async function task(newVersion, oldVersion) {
  await doSomething1()
  await doSomething2()
}

release({ task })
```

## 许可证

[MIT](https://github.com/varletjs/release/blob/main/LICENSE)
