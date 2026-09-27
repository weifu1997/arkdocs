---
title: CLI 参考
---

Quartz CLI 是与 Quartz 项目交互的主要方式。它提供创建项目、构建静态站点、与 GitHub 同步以及管理插件等命令。

可以使用 `npx quartz` 运行 CLI。

## 快速参考

| 命令        | 说明                                             | 示例                       |
| ----------- | ------------------------------------------------ | -------------------------- |
| `create`    | 初始化新的 Quartz 项目，并选择模板               | `npx quartz create`        |
| `build`     | 生成静态 HTML 文件                               | `npx quartz build`         |
| `sync`      | 与 GitHub 同步内容                               | `npx quartz sync`          |
| `upgrade`   | 将 Quartz 升级到最新版本（别名：`update`）       | `npx quartz upgrade`       |
| `plugin`    | 管理 Quartz 插件（安装、添加、移除等）           | `npx quartz plugin list`   |
| `tui`       | 启动交互式插件管理器                             | `npx quartz tui`           |

## 命令

- [[create|create]]：初始化新的 Quartz 项目，可选择模板（default、obsidian、ttrpg、blog）并配置基础 URL。
- [[build|build]]：将 Quartz 站点构建为静态 HTML。包含开发服务器。
- [[sync|sync]]：在本地与 GitHub 之间推送和拉取更改。
- [[upgrade|upgrade]]：将 Quartz 框架升级到最新版本。也可使用 `npx quartz update`。
- [[restore|restore]]：从本地缓存恢复内容文件夹。
- [[cli/plugin|plugin]]：安装、添加、移除、清理和配置插件。使用带参数的 `plugin install` 可完成锁定文件/配置同步、更新和检查。
- [[tui|tui]]：使用终端界面管理插件和布局。

## 全局参数

这些参数适用于所有 Quartz 命令：

| 参数            | 简写 | 说明                                                                                           | 默认值       |
| --------------- | ---- | ---------------------------------------------------------------------------------------------- | ------------ |
| `--directory`   | `-d` | 包含 Quartz 项目的目录                                                                         | `content`    |
| `--verbose`     | `-v` | 启用详细日志，便于调试                                                                         | `false`      |
| `--concurrency` | `-c` | 并行操作的最大工作线程数（例如 `build`、`plugin install`、`plugin add`）                       | CPU 核心数   |

不执行并行工作的命令会把 `-c` 当作空操作，因此始终可以安全传入。实际示例见 [[build#性能调优|build]] 和 [[cli/plugin#在低配硬件上安装|plugin]]。

## 帮助与版本

要查看任意命令的完整参数列表，使用 `--help`。

```shell
npx quartz --help
npx quartz build --help
```

要查看当前运行的 Quartz 版本，使用 `--version`。

```shell
npx quartz --version
```
