---
title: quartz sync
---

`sync` 命令会自动把本地更改推送到 GitHub，并从远程仓库拉取更新。它简化了 Git 工作流，适合不想手动运行 Git 命令、又希望保持站点更新的用户。

## 参数

| 参数          | 简写 | 说明                             | 默认值            |
| ------------- | ---- | -------------------------------- | ----------------- |
| `--directory` | `-d` | Quartz 项目所在目录              | 当前目录          |
| `--verbose`   | `-v` | 启用详细日志                     | `false`           |
| `--commit`    |      | 是否提交更改                     | `true`            |
| `--no-commit` |      | 跳过提交更改                     | `false`           |
| `--message`   | `-m` | 自定义提交说明                   | `update content`  |
| `--push`      |      | 是否将更改推送到远程             | `true`            |
| `--no-push`   |      | 跳过推送更改                     | `false`           |
| `--pull`      |      | 是否从远程拉取更改               | `true`            |
| `--no-pull`   |      | 跳过拉取更改                     | `false`           |

## 工作流程

运行 `npx quartz sync` 时，Quartz 会执行以下步骤：

1. **拉取**：从远程 GitHub 仓库获取并合并更改。
2. **添加**：暂存项目中所有新增和已修改的文件。
3. **提交**：为你的更改创建新的提交。
4. **推送**：把新提交发送到 GitHub。

## 常见用法

### 常规同步

最常见的用法是不带任何参数直接运行。这会拉取、提交并推送全部内容。

```shell
npx quartz sync
```

### 首次同步

如果刚设置好新仓库、还没有推送过任何内容，可能需要跳过拉取步骤。

```shell
npx quartz sync --no-pull
```

### 自定义提交说明

可以为更改提供更具体的说明。

```shell
npx quartz sync --message "添加关于园艺的新笔记"
```

### 从其他设备同步

如果你在另一台电脑上工作，只想获取最新更改，暂时不推送回去。

```shell
npx quartz sync --no-push --no-commit
```

## 故障排查

### Git 缓冲区

如果更改数量非常多，Git 偶尔可能因缓冲区限制失败。这时可以分批同步较少文件，或增大 Git 的 post buffer 大小。

### Autostash

Quartz 内部使用 `git pull --rebase --autostash`。这意味着如果你在运行 `sync` 时还有未暂存的更改，Quartz 会先临时收起它们，拉取远程更改，然后再把你的更改恢复回来。如果此过程中出现冲突，需要使用常规 Git 工具手动解决。

初始设置的更多信息见 [[installation|安装]]。
