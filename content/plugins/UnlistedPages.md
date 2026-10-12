---
title: UnlistedPages
description: "从目录树、图谱和搜索等全站检索界面中隐藏页面，但仍正常生成并允许直链访问。"
tags:
  - plugin/transformer
image:
new-in-v5: true
repository: "[quartz-community/unlisted-pages](https://github.com/quartz-community/unlisted-pages)"
enabled: true
required: false
---

零配置转换器插件。让页面 Frontmatter 中的 `unlisted: true` 成为全站所有公开列表界面的“第一等公民”排除机制。该页面依然会正常编译输出为 HTML，并可通过其绝对 URL 直接访问，但在 `contentIndex.json`、RSS 订阅源、Sitemap、图谱、侧边栏文件树、站内搜索、反向链接、最近笔记以及文件夹与标签归档中均彻底隐身。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 用法说明

只需在任意笔记的 Frontmatter 中添加 `unlisted: true`：

```yaml
---
title: 我的未公开笔记
unlisted: true
---
```

就这么简单！所有遵循 `file.data.unlisted` 约定的 Quartz v5 插件都会自动对该页面进行隐藏。

## 各插件响应行为一览

| 关联插件 | 当页面标记为 `unlisted: true` 时的具体行为 |
| -------------- | -------------------------------------------------------------------------- |
| `ContentIndex` | 该页面不会出现在 `contentIndex.json`、`sitemap.xml` 和 RSS 订阅源中。 |
| `Search` | 该页面不会出现在全局搜索结果中（搜索结果源于 `contentIndex.json`）。 |
| `Graph` | 该页面不会作为节点和边出现在关系图谱中。 |
| `Explorer` | 该页面不会出现在左侧边栏的文件树中。 |
| `Backlinks` | 该页面绝不会作为其他页面的反向链接来源出现。 |
| `RecentNotes` | 该页面不会出现在最近笔记列表中。 |
| `FolderPage` | 该页面不会出现在文件夹归档与目录列表中。 |
| `TagPage` | 该页面不会出现在标签归档列表中。 |

在上述所有情况下，该页面的 HTML 均正常生成，任何持有直接 URL 链接的用户均可正常浏览。

## 配置

零配置项，开箱即用：

```yaml title="quartz.config.yaml"
- source: github:quartz-community/unlisted-pages
  enabled: true
```

## 与 [[EncryptedPages]] 加密插件的协同

[[EncryptedPages]] 插件在设置了 `unlistWhenEncrypted: true` 选项或单篇笔记标记了 `unlisted: true` 时，也会设置 `file.data.unlisted`。这两个插件能够完美协同组合：

- 如果**仅安装了** `UnlistedPages`：任何在 Frontmatter 中标记 `unlisted: true` 的页面都会从发现界面中隐藏，与是否加密无关；
- 如果**仅安装了** `EncryptedPages`：`unlisted: true` 仅对同时设置了密码的加密页面生效；
- 如果**两者均安装**：`unlisted: true` 对无论是否加密的任何页面均全局生效。这是推荐的生产配置方案。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.UnlistedPages()`
- 源码：[`quartz-community/unlisted-pages`](https://github.com/quartz-community/unlisted-pages)
- 安装：`npx quartz plugin add github:quartz-community/unlisted-pages`
