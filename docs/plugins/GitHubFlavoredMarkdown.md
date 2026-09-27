---
title: GitHubFlavoredMarkdown
description: 支持 GitHub Flavored Markdown（表格、任务列表、脚注、删除线）。
tags:
  - plugin/transformer
image:
repository: "[quartz-community/github-flavored-markdown](https://github.com/quartz-community/github-flavored-markdown)"
enabled: true
required: false
---

This plugin enhances Markdown processing to support GitHub Flavored Markdown (GFM) which adds features like autolink literals, footnotes, strikethrough, tables and tasklists.

In addition, this plugin adds optional features for typographic refinement (such as converting straight quotes to curly quotes, dashes to en-dashes/em-dashes, and ellipses) and automatic heading links as a symbol that appears next to the heading on hover.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `enableSmartyPants`: When true, enables typographic enhancements. Default is true.
- `linkHeadings`: When true, automatically adds links to headings. Default is true.

## API

- Category: Transformer
- Function name: `ExternalPlugin.GitHubFlavoredMarkdown()`.
- 源码： [`quartz-community/github-flavored-markdown`](https://github.com/quartz-community/github-flavored-markdown)
- 安装： `npx quartz plugin add github:quartz-community/github-flavored-markdown`
