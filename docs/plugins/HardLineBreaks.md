---
title: HardLineBreaks
description: 将单个换行视为硬换行。
tags:
  - plugin/transformer
image: "#ff8000"
repository: "[quartz-community/hard-line-breaks](https://github.com/quartz-community/hard-line-breaks)"
enabled: false
required: false
---

This plugin automatically converts single line breaks in Markdown text into hard line breaks in the HTML output. This plugin is not enabled by default as this doesn't follow the semantics of actual Markdown but you may enable it if you'd like parity with [[Obsidian compatibility|Obsidian]].

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Transformer
- Function name: `ExternalPlugin.HardLineBreaks()`.
- 源码： [`quartz-community/hard-line-breaks`](https://github.com/quartz-community/hard-line-breaks)
- 安装： `npx quartz plugin add github:quartz-community/hard-line-breaks`
