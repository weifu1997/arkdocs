---
title: 私有页面与草稿过滤
tags:
  - feature/filter
---

有些个人笔记或半成品构想你可能不想公开推送到线上网站。Quartz 提供了两种互为补充的过滤机制来实现这一点：

## 1. 过滤器插件（Filter Plugins）

[[making plugins#过滤器（Filters）|过滤器插件]] 能够根据设定的特定元数据条件筛选剔除内容。默认情况下，Quartz 启用了 [[RemoveDrafts]] 插件，它会自动过滤并隐藏所有在 Frontmatter 中标记了 `draft: true` 的笔记。

如果你希望采取“白名单”机制，仅发布明确标记公开的文章，可以使用 [[ExplicitPublish]] 插件。它会过滤掉所有笔记，唯独保留在 Frontmatter 中显式声明了 `publish: true` 的文章。

> [!warning] 非 Markdown 附件说明
> 无论使用何种过滤器插件，**所有非 Markdown 静态资源文件（如图片、录音、PDF 文件等）默认都会在构建时被复制输出**。如果你希望彻底排除某些私有附件，请使用下述的 `ignorePatterns`。

## 2. 忽略模式（`ignorePatterns`）

在 `quartz.config.yaml` 的 [[configuration|全局通用配置]] 中，你可以配置 `ignorePatterns` 列表。凡是匹配这些模式的文件，在最初的内容扫描阶段就会被完全跳过，根本不会被读取和解析。它完整支持 [fast-glob](https://github.com/mrmlnc/fast-glob#pattern-syntax) 语法。

常用示例：

- `some/folder`：排除整个 `some/folder` 目录及其所有子文件；
- `*.md`：排除所有 `.md` 结尾的文件；
- `!(*.md)`：排除所有*非* `.md` 结尾的文件（例如图片、PDF等）。注意取反感叹号后面*必须*用圆括号包裹其余模式！
- `**/private`：排除任意嵌套层级下名为 `private` 的文件夹或文件。

> [!warning] Git 仓库防泄露提示
> 无论是通过过滤器插件还是 `ignorePatterns`，都仅代表**生成的公开网站中不包含该页面**。如果你的 GitHub 仓库本身是公开的（Public），请务必同时在 `.gitignore` 中加入该私有文件夹，以防止私有笔记源码被误提交并推送至公开仓库！
