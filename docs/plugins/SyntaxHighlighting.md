---
title: SyntaxHighlighting
description: 为代码块提供语法高亮。
tags:
  - plugin/transformer
image: https://images.unsplash.com/photo-1580569214296-5cf2bffc5ccd
repository: "[quartz-community/syntax-highlighting](https://github.com/quartz-community/syntax-highlighting)"
enabled: true
required: false
---

This plugin is used to add syntax highlighting to code blocks in Quartz. See [[syntax highlighting]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `theme`: a separate id of one of the [themes bundled with Shikiji](https://shikiji.netlify.app/themes). One for light mode and one for dark mode. Defaults to `theme: { light: "github-light", dark: "github-dark" }`.
- `keepBackground`: If set to `true`, the background of the Shikiji theme will be used. With `false` (default) the Quartz theme color for background will be used instead.
- `clipboard`: Whether to add a copy-to-clipboard button to code blocks. Defaults to `true`.
- `tokenClassification`: Whether to add semantic token classification CSS classes to code tokens. Defaults to `true`.

In addition, you can further override the colours in the `quartz/styles/syntax.scss` file.

## API

- Category: Transformer
- Function name: `ExternalPlugin.SyntaxHighlighting()`.
- 源码： [`quartz-community/syntax-highlighting`](https://github.com/quartz-community/syntax-highlighting)
- 安装： `npx quartz plugin add github:quartz-community/syntax-highlighting`
