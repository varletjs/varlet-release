# 从 v1 升级到 v2

本文档面向从 `v1.x` 升级到当前最新 `v2.2.1` 的用户。

范围说明：

- 基线对比为 `v1.2.0 -> v2.2.1`

## 迁移概览

大多数 `release` / `publish` 核心流程在 `v2` 中仍然延续 `v1` 的使用方式，真正需要迁移的点主要集中在：

1. `CLI` 参数定义调整
2. `commit-lint` 的入参方式变更
3. `changelog` 的 Node API 与生成策略调整

`Node.js` 与包格式方面没有新增迁移成本：

- `v1` 已经是纯 `ESM`
- `v2` 仍然要求 `Node.js ^20.19.0 || >=22.12.0`

## 必改项

### 1. `commit-lint` 已去除 `--commitMessagePath (-p)` ，改为直接传入文件路径

`v1`：

```bash
vr commit-lint -p .git/COMMIT_EDITMSG
```

`v2`：

```bash
vr commit-lint .git/COMMIT_EDITMSG
```

如果你在 `simple-git-hooks`、`husky` 或自定义脚本里还在传 `-p` / `--commitMessagePath`，需要改成直接传文件路径。

推荐写法：

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint $1"
  }
}
```

### 2. `changelog` 不再支持 `preset`

`v1` 的 `changelog` 支持：

- CLI: `--preset`
- Node API: `preset`

`v2` 已移除这部分能力，最终实现固定为当前内置的 changelog 生成策略。

如果你之前有下面这类调用，需要删除：

```bash
vr changelog --preset angular
```

```ts
changelog({
  preset: 'angular',
})
```

### 3. `writerOpts` 重命名为 `writerOpt`

`v1`：

```ts
changelog({
  writerOpts: {
    /* ... */
  },
})
```

`v2`：

```ts
changelog({
  writerOpt: {
    /* ... */
  },
})
```

如果你有自定义 changelog 输出格式，这一项需要同步修改。

## 需要检查的兼容项

### CLI 短参数有调整

长参数整体变化不大，但部分短参数已经变更或移除：

| 命令          | v1                        | v2                   |
| ------------- | ------------------------- | -------------------- |
| `release`     | `-nt, --npm-tag`          | `-t, --npm-tag`      |
| `release`     | `-sc, --skip-changelog`   | `--skip-changelog`   |
| `release`     | `-sgt, --skip-git-tag`    | `--skip-git-tag`     |
| `changelog`   | `-rc, --releaseCount`     | `-c, --releaseCount` |
| `commit-lint` | `-p, --commitMessagePath` | 改为位置参数         |

如果你的 CI、脚本或 Git Hook 使用了旧短参数，建议统一替换为当前写法。

### `changelog` 的默认输出会有细节差异

虽然 `changelog` 功能保留，但 `v2` 最终采用了新的生成实现，升级后你需要留意以下兼容性：

- 生成内容的分组标题可能有变化，例如 `Code Refactoring` 变为 `Refactoring`
- 不再通过 `preset` 切换输出风格
- 新增了 `showTypes`、`outputUnreleased`、`cwd` 等能力

如果你的项目会：

- 解析 `CHANGELOG.md` 文本
- 依赖固定章节标题
- 对 changelog 模板做二次处理

建议升级后重新生成一次并比对产物。

## Node API 对照

### `changelog`

`v1`：

```ts
changelog({
  file?: string
  releaseCount?: number
  preset?: string
  writerOpts?: object
})
```

`v2`：

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

迁移建议：

- 删除 `preset`
- 将 `writerOpts` 改为 `writerOpt`
- 如果你以前通过外部切换 `preset` 控制输出风格，改为基于 `writerOpt` 或生成结果做兼容

### `release` / `publish`

这两个 API 在 `v2` 中主要是增强，不是破坏性迁移：

- `release` 新增 `cwd`
- `publish` 新增 `cwd`

已有 `v1` 调用通常可以直接继续使用。

## 新增但非破坏性能力

以下能力是 `v2` 新增的，不影响旧代码，但升级后可以考虑接入：

- `lockfile-check` CLI 命令
- `lockfileCheck` Node API 导出
- `changelog({ outputUnreleased: true })`

示例：

```json
{
  "simple-git-hooks": {
    "post-merge": "pnpm exec vr lockfile-check"
  }
}
```

## 推荐升级步骤

1. 升级 `@varlet/release` 到最新 `v2`
2. 全局搜索以下旧用法并替换
3. 重新跑一次本地 `release` / `changelog` / `commit-lint`
4. 重点检查 Git Hook、CI 和自定义脚本

建议搜索关键词：

- `commitMessagePath`
- `--preset`
- `writerOpts`
- `-nt`
- `-rc`
- `-sc`
- `-sgt`

## 可直接替换的示例

### Git Hook

`v1`：

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint -p $1"
  }
}
```

`v2`：

```json
{
  "simple-git-hooks": {
    "commit-msg": "pnpm exec vr commit-lint $1",
    "post-merge": "pnpm exec vr lockfile-check"
  }
}
```

### Changelog API

`v1`：

```ts
import { changelog } from '@varlet/release'

await changelog({
  releaseCount: 0,
  preset: 'angular',
  writerOpts: {},
})
```

`v2`：

```ts
import { changelog } from '@varlet/release'

await changelog({
  releaseCount: 0,
  writerOpt: {},
})
```
