---
title: CrawlLinks
description: "核心双链与内部链接抓取、解析与重写处理器。不建议移除。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/crawl-links](https://github.com/quartz-community/crawl-links)"
enabled: true
required: true
---

该插件负责扫描文档中的所有链接并将其解析转换为正确的规范路径，对于图片等嵌入资源链接同样必不可少。详情请参阅 [[features/Obsidian compatibility|Obsidian 兼容特性]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `markdownLinkResolution`：设置 Markdown 路径的解析策略，可选 `"absolute"`（默认）、`"relative"` 或 `"shortest"`。建议与你在 Obsidian 中的设置保持一致。
  - `absolute`：相对于 `content` 根目录解析；
  - `relative`：相对于当前正在编辑的文件相对解析；
  - `shortest`：按最短文件名解析。如果存在重名文件，则需使用完整路径。
- `prettyLinks`：若为 `true`（默认值），通过移除冗余文件夹路径简化链接显示文本（例如 `folder/deeply/nested/note` 简化显示为 `note`）。
- `openLinksInNewTab`：若为 `true`，将所有外部超链接设为在新标签页打开（`target="_blank"`）。默认为 `false`。
- `lazyLoad`：若为 `true`，为图片和视频等资源元素添加懒加载属性（`loading="lazy"`），加速首屏渲染。默认为 `false`。
- `externalLinkIcon`：若为 `true`（默认值），在外部超链接旁边添加外链小图标，以便在视觉上与内部双链快速区分。
- `disableBrokenWikilinks`：若为 `true`，无法解析到目标文件的悬空死链会额外附加一个 `broken` CSS 类名，方便针对死链进行醒目的特殊样式着色。默认为 `false`。

> [!warning] 核心必需警告
> **强烈不建议**移除或禁用该插件，否则全站双链和图片引用将无法正常解析！

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.CrawlLinks()`
- 源码：[`quartz-community/crawl-links`](https://github.com/quartz-community/crawl-links)
- 安装：`npx quartz plugin add github:quartz-community/crawl-links`
