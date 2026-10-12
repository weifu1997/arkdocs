---
title: quartz restore
---

`restore` 命令是一种安全机制，可以从本地缓存恢复你的 **内容文件夹**。该命令只影响 Markdown 文件，不会恢复插件或配置。

要把插件恢复到特定状态，请使用 [[cli/plugin|npx quartz plugin install]]。

## 何时使用

在以下情况应使用 `restore`：

- `quartz upgrade` 失败并损坏了内容。
- 你意外删除了内容文件夹中的文件。
- 遇到了想撤销的复杂合并冲突。

## 工作原理

Quartz 会为内容文件夹维护一份隐藏缓存。每次运行某些命令时，Quartz 都会确保存在 Markdown 文件的备份。`restore` 命令只是把这些文件复制回主内容目录。

```shell
npx quartz restore
```

## 示例流程

如果更新失败，使项目处于损坏状态：

1. **恢复**：运行 `npx quartz restore` 找回内容。
2. **清理**：使用 Git 重置其他损坏的代码文件。
3. **重试**：再次尝试更新，或手动应用所需更改。
