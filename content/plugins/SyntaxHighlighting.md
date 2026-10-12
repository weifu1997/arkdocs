---
title: SyntaxHighlighting
description: "为代码块提供高性能静态语法高亮着色。"
tags:
  - plugin/transformer
image: https://images.unsplash.com/photo-1580569214296-5cf2bffc5ccd
repository: "[quartz-community/syntax-highlighting](https://github.com/quartz-community/syntax-highlighting)"
enabled: true
required: false
---

该插件用于在 Quartz 构建阶段为代码块提供精准的静态语法高亮着色。详情请参阅 [[features/syntax highlighting|代码语法高亮指南]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `theme`：分别为浅色模式和深色模式指定来自 [Shiki/Shikiji 的主题 ID](https://shiki.style/themes)。默认为 `theme: { light: "github-light", dark: "github-dark" }`。
- `keepBackground`：若设为 `true`，使用代码主题自带的原生背景色；若为 `false`（默认值），使用 Quartz 站点主题全局统一的背景底色。
- `clipboard`：是否在代码块右上角添加一键“复制到剪贴板”按钮。默认为 `true`。
- `tokenClassification`：是否向代码语法 Token 添加语义化分类 CSS 类名。默认为 `true`。

此外，你还可以在 `quartz/styles/syntax.scss` 样式表中对代码语法高亮配色进行更深度的自定义微调。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.SyntaxHighlighting()`
- 源码：[`quartz-community/syntax-highlighting`](https://github.com/quartz-community/syntax-highlighting)
- 安装：`npx quartz plugin add github:quartz-community/syntax-highlighting`
