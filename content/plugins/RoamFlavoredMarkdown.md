---
title: RoamFlavoredMarkdown
description: "转换并兼容 Roam Research 的专属 Markdown 块语法与短代码宏。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/roam](https://github.com/quartz-community/roam)"
enabled: false
required: false
---

该插件为 Quartz 提供对 [Roam Research](https://roamresearch.com) 专有语法的兼容转换。详情请参阅 [[features/Roam Research compatibility|Roam Research 兼容特性]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `orComponent`：若为 `true`（默认值），将 Roam 的 `{{ or:选项A|选项B|选项C }}` 短代码转换为 HTML 下拉菜单。
- `TODOComponent`：若为 `true`（默认值），将 Roam 的 `{{[[TODO]]}}` 短代码转换为未选中复选框。
- `DONEComponent`：若为 `true`（默认值），将 Roam 的 `{{[[DONE]]}}` 短代码转换为已勾选复选框。
- `videoComponent`：若为 `true`（默认值），将 Roam 的 `{{[[video]]:URL}}` 转换为嵌入式视频播放器。
- `audioComponent`：若为 `true`（默认值），将 Roam 的 `{{[[audio]]:URL}}` 转换为嵌入式音频播放器。
- `pdfComponent`：若为 `true`（默认值），将 Roam 的 `{{[[pdf]]:URL}}` 转换为嵌入式 PDF 阅读器。
- `blockquoteComponent`：若为 `true`（默认值），将 Roam 的 `{{[[>]]}}` 短代码转换为引用块。
- `tableComponent`：若为 `true`（默认值），将 Roam 表格语法转换为标准 HTML 表格。
- `attributeComponent`：若为 `true`（默认值），将 Roam 的双冒号属性语法转换为结构化属性渲染。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.RoamFlavoredMarkdown()`
- 源码：[`quartz-community/roam`](https://github.com/quartz-community/roam)
- 安装：`npx quartz plugin add github:quartz-community/roam`
