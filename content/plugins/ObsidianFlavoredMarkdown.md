---
title: ObsidianFlavoredMarkdown
description: "Obsidian 专属特色 Markdown 扩展（双链、标注块、高亮、标签、Mermaid 图表等）。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/obsidian-flavored-markdown](https://github.com/quartz-community/obsidian-flavored-markdown)"
enabled: true
required: false
---

该插件为 Quartz 提供核心的 [[features/Obsidian compatibility|Obsidian 语法无缝兼容]] 支持。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `comments`：若为 `true`（默认值），启用解析 `%%` 样式的 Obsidian 内部隐藏注释语法。
- `highlight`：若为 `true`（默认值），启用解析 `==` 样式的荧光高亮语法。
- `wikilinks`：若为 `true`（默认值），将 `[[wikilinks]]` 双链转换为标准可交互超链接。
- `callouts`：若为 `true`（默认值），启用支持 [[features/callouts|标注块（Callout）]] 语法。
- `mermaid`：若为 `true`（默认值），启用 Markdown 内的 [[features/Mermaid diagrams|Mermaid 图表]] 矢量渲染。
- `parseTags`：若为 `true`（默认值），自动解析正文中的 `#tag` 标签并生成超链接。
- `parseBlockReferences`：若为 `true`（默认值），处理 `^block-id` 块引用，支持精准跨段落链接。
- `enableInHtmlEmbed`：若为 `true`，允许在原生 HTML 标签节点内部解析 Markdown 语法。默认为 `false`。
- `enableYouTubeEmbed`：若为 `true`（默认值），允许使用外部图片语法直接嵌入 YouTube 视频播放器。
- `enableTweetEmbed`：若为 `true`（默认值），允许将 Twitter/X 链接嵌入为静态引用卡片。
- `enableVideoEmbed`：若为 `true`（默认值），允许直接嵌入视频文件。
- `enableCheckbox`：若为 `true`，启用交互式任务复选框及自定义任务字符（如 `- [?]`、`- [!]`、`- [/]`）。默认为 `false`。
- `enableObsidianUri`：若为 `true`（默认值），为 `obsidian://` 协议链接挂载专属 CSS 类名和数据属性，便于定制快捷打开按钮。

> [!warning] 核心必需提醒
> 如果你正在使用 Obsidian 撰写和管理笔记，**切勿移除**此插件！

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.ObsidianFlavoredMarkdown()`
- 源码：[`quartz-community/obsidian-flavored-markdown`](https://github.com/quartz-community/obsidian-flavored-markdown)
- 安装：`npx quartz plugin add github:quartz-community/obsidian-flavored-markdown`
