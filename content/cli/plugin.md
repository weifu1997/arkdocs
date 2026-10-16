---
title: quartz plugin
---

`plugin` 命令是 Quartz v5 插件管理系统的核心。它允许你直接从命令行安装、配置和更新插件。

所有插件都存放在 `.quartz/plugins/` 目录中，版本由 `quartz.lock.json` 跟踪。

## 子命令

### list

列出当前已安装的插件及其版本。

```shell
npx quartz plugin list
```

### add

从 Git 仓库添加新插件。

```shell
npx quartz plugin add github:username/repo
```

要从特定分支或引用安装，在源后面追加 `#ref`：

```shell
npx quartz plugin add github:username/repo#my-branch
npx quartz plugin add git+https://github.com/username/repo.git#my-branch
npx quartz plugin add https://github.com/username/repo.git#my-branch
```

也可以从本地目录添加插件。这适合本地开发或离线环境：

```shell
npx quartz plugin add ./path/to/my-plugin
npx quartz plugin add ../sibling-plugin
npx quartz plugin add /absolute/path/to/plugin
```

本地插件会以符号链接的方式放入 `.quartz/plugins/`，因此你对源目录的更改会立即生效，无需重新安装。

指定分支后，该分支会写入锁定文件。之后的命令（`install`、`prune`）会自动遵循该分支。使用 `install --latest` 可获取该分支的最新提交。

> [!tip]
> `plugin add` 也接受 `--concurrency` / `-c`，用于限制同时克隆和构建的远程仓库数量。这与 [[#install]] 中记录的参数相同，适合在低配硬件上一次添加多个插件。

### remove

移除已安装的插件。

```shell
npx quartz plugin remove plugin-name
```

### install

为 Quartz 项目安装插件。默认会安装 `quartz.lock.json` 中列出的所有插件。

```shell
npx quartz plugin install
```

#### 参数

- `--from-config`：与 `quartz.config.yaml` 同步插件，而不是锁定文件。这会安装缺失的插件，并清理孤立插件。
- `--latest`：从远程源获取插件最新版本，而不是使用锁定文件中的版本。
- `--clean`：跳过已存在的目录，执行全新安装。
- `--dry-run`：预览更改，不实际安装或删除任何文件。
- `--concurrency`、`-c`：并行克隆、获取和构建插件的最大数量。默认为 CPU 核心数。在内存或 CPU 受限的机器上，可以把该值调低（例如 `-c 1` 或 `-c 2`），以避免默认并行导致失败、内存不足或卡住。见下方 [[#在低配硬件上安装]]。

#### 位置参数

- `[names..]`：可选的插件名称列表，用于安装或更新指定插件。

```shell
# 将指定插件更新到最新版本
npx quartz plugin install --latest plugin-a plugin-b

# 预览将根据配置安装的内容
npx quartz plugin install --from-config --dry-run
```

### enable / disable

在 `quartz.config.yaml` 中切换插件状态，而不删除其文件。

```shell
npx quartz plugin enable plugin-name
npx quartz plugin disable plugin-name
```

### config

查看或修改指定插件的配置。

```shell
# 查看配置
npx quartz plugin config plugin-name

# 设置一个值
npx quartz plugin config plugin-name --set key=value
```

### prune

移除 `quartz.config.yaml` 中不再引用的已安装插件。适合在从配置中删除插件条目后进行清理。

> [!note]
> 运行 `plugin install --from-config` 时，同步过程也会移除孤立插件。如果你只想清理、而不安装新插件，请使用 `prune`。

```shell
npx quartz plugin prune
```

使用 `--dry-run` 可预览将要移除的插件，而不做实际更改：

```shell
npx quartz plugin prune --dry-run
```

## 常见工作流

### 添加并启用插件

要添加新插件并开始使用：

1. 添加插件：`npx quartz plugin add github:quartz-community/example`
2. 启用它：`npx quartz plugin enable example`

### 更新全部插件

要保持插件为最新：

```shell
npx quartz plugin install --latest
```

### 在低配硬件上安装

默认情况下，`plugin install` 和 `plugin add` 会在所有 CPU 核心上并行克隆、获取和构建插件。在内存受限的机器上（低配笔记本、树莓派、小型 VPS、受限的 CI 运行器），这可能会耗尽内存或让系统过载，因为每个工作线程都可能同时启动自己的 `npm install` / `npm run build`。

> [!note]
> 大多数社区插件现在都会附带预构建的 `dist/` 目录。Quartz 发现该目录后会跳过安装和构建步骤，从而更快、更省资源。本节主要适用于开发中的插件，或未提供预构建发行包的插件。

如果 `plugin install` 在你的机器上失败、卡住或内存不足，请用 `--concurrency` / `-c` 降低并发：

```shell
# 一次只安装一个插件（最稳妥，也最慢）
npx quartz plugin install --latest -c 1

# 一次两个 — 在 4 GB 内存的机器上通常是较好的平衡
npx quartz plugin install --latest --concurrency 2
```

同一参数也适用于 `plugin add` 以及其他会执行并行工作的插件子命令：

```shell
npx quartz plugin add github:quartz-community/some-plugin -c 1
```

### 管理配置

如果你想在不打开 YAML 文件的情况下更改插件设置：

```shell
npx quartz plugin config explorer --set useSavedState=true
```

### 清理未使用的插件

如果你已经从配置中移除了插件，并希望清理残留文件：

```shell
npx quartz plugin prune --dry-run  # 先预览
npx quartz plugin prune            # 移除孤立插件
```

### 根据配置进行设置

在新机器或 CI 中设置时，`install --from-config` 会确保已安装插件与配置一致 — 安装缺失插件，并移除不再引用的插件：

```shell
npx quartz plugin install --from-config
```

### 使用分支进行测试

如果插件作者在单独分支上提供了修复或新功能，你可以直接安装，而不必等待它合并到默认分支：

```shell
# 从功能分支安装
npx quartz plugin add github:username/repo#fix/some-bug

# 之后，去掉引用后重新添加，即可切回默认分支
npx quartz plugin remove repo
npx quartz plugin add github:username/repo
```

分支引用会记录在 `quartz.lock.json` 中，因此在插件被重新添加且不再带引用之前，`install --latest` 会继续跟踪指定分支。

如果没有 `quartz.config.yaml`，`prune` 和 `install --from-config` 都会回退到 `quartz.config.default.yaml`。

### 本地插件开发

对于本地插件开发或离线环境，可以从本地目录添加插件：

```shell
npx quartz plugin add ./my-local-plugin
```

本地插件会以符号链接的方式放入 `.quartz/plugins/`，因此更改会立即生效。运行 `install --latest` 时，本地插件会重新构建（npm install + npm run build），而不会执行任何 git 操作。

> [!note]
> 本地符号链接的插件通常会使用这种安装时构建的回退方式，因为开发期间 `dist/` 目录通常会被 gitignore。

`install --latest --dry-run` 命令会把本地插件显示为「本地」状态，而不是检查远程更新。

要把本地插件切回 git 源：

```shell
npx quartz plugin remove my-local-plugin
npx quartz plugin add github:username/my-local-plugin
```

### 子目录（Monorepo）插件

有些插件位于更大仓库的子目录中，而不是仓库根目录。对这些插件，可以在 `quartz.config.yaml` 中把插件源指定为带 `subdir` 字段的对象：

```yaml title="quartz.config.yaml"
plugins:
  - source:
      repo: "https://github.com/username/monorepo.git"
      subdir: plugin
    enabled: true
```

这会让 Quartz 克隆整个仓库，但只安装指定子目录中的内容。

可以把 `subdir` 与 `ref` 组合使用，以固定分支或标签，并用 `name` 覆盖插件目录名：

```yaml title="quartz.config.yaml"
plugins:
  - source:
      repo: "https://github.com/username/monorepo.git"
      subdir: packages/my-plugin
      ref: v2.0
      name: my-plugin
    enabled: true
```

对象源字段的完整参考见 [[configuration#高级源路径配置（Advanced Source Options）|高级源选项]]。

> [!note]
> `plugin add` CLI 命令适用于字符串源。要使用带 `subdir` 的对象源格式，请直接编辑 `quartz.config.yaml`，然后运行 `npx quartz plugin install --from-config` 进行安装。

## 从已弃用命令迁移

| 旧命令                                | 新的等价命令                                            |
| ------------------------------------- | ------------------------------------------------------- |
| `npx quartz plugin restore`           | `npx quartz plugin install --clean`                     |
| `npx quartz plugin update`            | `npx quartz plugin install --latest`                    |
| `npx quartz plugin update my-plugin`  | `npx quartz plugin install --latest my-plugin`          |
| `npx quartz plugin check`             | `npx quartz plugin install --latest --dry-run`          |
| `npx quartz plugin resolve`           | `npx quartz plugin install --from-config`               |
| `npx quartz plugin resolve --dry-run` | `npx quartz plugin install --from-config --dry-run`     |
| `npx quartz update`                   | `npx quartz plugin install --latest`                    |

旧命令仍可作为隐藏别名使用，但会打印弃用警告。

## 插件状态

不带子命令运行 plugin 命令时，会显示所有已安装插件的状态面板，包括是否有可用更新：

```shell
npx quartz plugin
```

这会显示每个插件的来源、提交、启用/禁用状态，并并行检查可用更新。完整的交互式管理界面请改用 [[tui|npx quartz tui]]。
