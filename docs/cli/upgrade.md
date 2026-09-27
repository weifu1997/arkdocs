---
title: quartz upgrade
---

`upgrade` 命令会从官方 Quartz 仓库拉取更改，将 Quartz 框架本身升级到最新版本。

## 用法

```shell
npx quartz upgrade
```

## 工作原理

运行 `npx quartz upgrade` 时，Quartz 会执行以下步骤：

1. **备份内容** — 内容文件夹会被缓存到本地，防止数据丢失。
2. **拉取最新 Quartz 代码** — 使用 Git 从官方上游仓库（`upstream/v5`）获取并合并。
3. **显示版本变化** — 显示版本过渡（例如 `v5.0.0 → v5.1.0`），或确认已经是最新版本。
4. **更新依赖** — 运行 `npm install`，确保所有软件包与新版本匹配。
5. **恢复插件** — 根据 `quartz.lock.json` 重新安装插件，以确保兼容。
6. **检查插件兼容性** — 验证已安装插件是否与新的 Quartz 版本兼容。

## 处理冲突

因为 Quartz 几乎允许自定义每一部分代码，升级有时会产生合并冲突。这通常发生在你修改过的文件也被 Quartz 团队更新时。

Quartz 会自动处理 `quartz.lock.json` 中的合并冲突：拉取前备份锁定文件，之后再恢复。这能避免升级时最常见的一类冲突。

对于其他文件，如果出现冲突：

1. Git 会在受影响文件中标记冲突部分。
2. 你需要打开这些文件，手动选择要保留的更改。
3. 解决冲突后，提交这些更改。

## 恢复

如果升级出错，或让项目处于无法使用的状态，可以使用 [[restore|restore]] 命令从本地缓存恢复内容。

## 参数

`upgrade` 命令支持标准的 [[cli/index|通用参数]]（`--directory`、`--verbose`）。

## 另见

- [[cli/plugin|quartz plugin install --latest]] — 更新已安装的插件
- [[upgrading|升级 Quartz]] — 详细升级指南
- [[restore|quartz restore]] — 从缓存恢复内容
