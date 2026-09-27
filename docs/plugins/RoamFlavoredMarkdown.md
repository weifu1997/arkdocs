---
title: RoamFlavoredMarkdown
description: 兼容 Roam Research 导出格式。
tags:
  - plugin/transformer
image:
repository: "[quartz-community/roam](https://github.com/quartz-community/roam)"
enabled: false
required: false
---

This plugin provides support for [Roam Research](https://roamresearch.com) compatibility. See [[Roam Research compatibility]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `orComponent`: If `true` (default), converts Roam `{{ or:ONE|TWO|THREE }}` shortcodes into HTML Dropdown options.
- `TODOComponent`: If `true` (default), converts Roam `{{[[TODO]]}}` shortcodes into HTML check boxes.
- `DONEComponent`: If `true` (default), converts Roam `{{[[DONE]]}}` shortcodes into checked HTML check boxes.
- `videoComponent`: If `true` (default), converts Roam `{{[[video]]:URL}}` shortcodes into embeded HTML video.
- `audioComponent`: If `true` (default), converts Roam `{{[[audio]]:URL}}` shortcodes into embeded HTML audio.
- `pdfComponent`: If `true` (default), converts Roam `{{[[pdf]]:URL}}` shortcodes into embeded HTML PDF viewer.
- `blockquoteComponent`: If `true` (default), converts Roam `{{[[>]]}}` shortcodes into Quartz blockquotes.
- `tableComponent`: If `true` (default), converts Roam table syntax into HTML tables.
- `attributeComponent`: If `true` (default), converts Roam attribute syntax into rendered attributes.

## API

- Category: Transformer
- Function name: `ExternalPlugin.RoamFlavoredMarkdown()`.
- 源码： [`quartz-community/roam`](https://github.com/quartz-community/roam)
- 安装： `npx quartz plugin add github:quartz-community/roam`
