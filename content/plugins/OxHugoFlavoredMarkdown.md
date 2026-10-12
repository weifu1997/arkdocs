---
title: OxHugoFlavoredMarkdown
description: "兼容由 ox-hugo 导出的 Emacs Org-mode 格式笔记。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/ox-hugo](https://github.com/quartz-community/ox-hugo)"
enabled: false
required: false
---

该插件为 Quartz 提供对 [ox-hugo](https://github.com/kaushalmodi/ox-hugo) 的兼容性转换支持。详情请参阅 [[features/OxHugo compatibility|OxHugo 兼容特性]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `wikilinks`：若为 `true`（默认值），将 Hugo 的 `{{ relref }}` 短代码自动转换为 Quartz [[features/wikilinks|双向链接]]。
- `removePredefinedAnchor`：若为 `true`（默认值），自动从小标题中剔除预定义的锚点语法。
- `removeHugoShortcode`：若为 `true`（默认值），从正文中自动清理多余的 Hugo `{{}}` 短代码语法。
- `replaceFigureWithMdImg`：若为 `true`（默认值），将 `<figure/>` 自动重写为标准 Markdown 图片 `![]()`。
- `replaceOrgLatex`：若为 `true`（默认值），将 Org-mode 的 LaTeX 片段转换为由 `$` 和 `$$` 包裹的标准公式。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.OxHugoFlavoredMarkdown()`
- 源码：[`quartz-community/ox-hugo`](https://github.com/quartz-community/ox-hugo)
- 安装：`npx quartz plugin add github:quartz-community/ox-hugo`
