---
title: HardLineBreaks
description: "将 Markdown 中的单个软换行直接视为 HTML 硬换行。"
tags:
  - plugin/transformer
image: "#ff8000"
repository: "[quartz-community/hard-line-breaks](https://github.com/quartz-community/hard-line-breaks)"
enabled: false
required: false
---

该插件自动将 Markdown 源码中的单次回车换行直接转换为 HTML 输出中的硬换行（`<br>`）。该插件默认未启用，因为这不符合传统 Markdown 规范（传统 Markdown 需要两个空格或两次回车才换行）；但如果你希望与 Obsidian 的默认回车换行习惯保持一致，可以启用此插件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.HardLineBreaks()`
- 源码：[`quartz-community/hard-line-breaks`](https://github.com/quartz-community/hard-line-breaks)
- 安装：`npx quartz plugin add github:quartz-community/hard-line-breaks`
