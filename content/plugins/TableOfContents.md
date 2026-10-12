---
title: TableOfContents
description: "根据 Markdown 标题自动提取、生成并渲染文档目录大纲。"
tags:
  - plugin/transformer
  - plugin/component
image: https://images.unsplash.com/photo-1768527338896-3765921e992d
repository: "[quartz-community/table-of-contents](https://github.com/quartz-community/table-of-contents)"
enabled: true
required: false
---

该插件负责从 Markdown 文档中自动提取标题层级，并生成带滚动位置指示的目录（TOC）。详情请参阅 [[features/table of contents|目录功能文档]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `maxDepth`：目录包含的最大标题层级深度。取值范围从 `1`（仅包含一级标题）到 `6`（所有层级标题）。默认值为 `3`。
- `minEntries`：页面上标题数量至少达到多少条时才显示目录。默认值为 `1`。
- `showByDefault`：若为 `true`（默认值），默认开启目录显示。可在单篇笔记的 Frontmatter 中通过 `enableToc: false` 单独关闭。
- `collapseByDefault`：若为 `true`，目录初始状态默认折叠。默认值为 `false`。
- `layout`：目录组件的可视化布局风格。可选 `"modern"`（现代卡片风）或 `"legacy"`（经典树形）。默认值为 `"modern"`。

> [!warning] 配合组件说明
> 该插件需要与 `quartz.config.yaml` 布局中的 `Plugin.TableOfContents` 组件配合使用以确定在页面中的展示槽位。

## API

- 类别：转换器（Transformer）、组件（Component）
- 函数名：`ExternalPlugin.TableOfContentsTransformer()`、`ExternalPlugin.TableOfContents()`
- 源码：[`quartz-community/table-of-contents`](https://github.com/quartz-community/table-of-contents)
- 安装：`npx quartz plugin add github:quartz-community/table-of-contents`
