---
title: "Bases 数据库支持"
tags:
  - component
---

Quartz 支持将 [Obsidian Bases](https://obsidian.md/changelog/2025-04-15-desktop-v1.8.0/)（`.base` 文件）渲染为类似 Notion 的交互式多维数据库视图。Bases 文件定义了对知识库笔记的查询检索，并将结果以表格（Table）、列表（List）、卡片（Card）、画廊（Gallery）和看板（Board）等多种视图自由展现。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

Bases 支持由 [[BasesPage]] 页面插件提供。请参阅该插件文档了解视图配置、表达式计算引擎以及如何扩展自定义视图。

## 实时示例

![[Base.base]]

## 插件管理

- 安装插件：`npx quartz plugin add github:quartz-community/bases-page`
- 插件源码：[`quartz-community/bases-page`](https://github.com/quartz-community/bases-page)
