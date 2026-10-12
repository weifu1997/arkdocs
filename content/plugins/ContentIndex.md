---
title: ContentIndex
description: "生成站点地图（Sitemap）、RSS 订阅源和全站内容索引 JSON。"
tags:
  - plugin/emitter
image:
repository: "[quartz-community/content-index](https://github.com/quartz-community/content-index)"
enabled: true
required: false
---

该插件为你的站点生成 RSS 订阅源与 XML 站点地图（Sitemap）。[[features/RSS Feed|RSS 订阅]] 允许读者实时订阅你的最新内容，而 Sitemap 则有助于各大搜索引擎更全面地爬取和收录你的网站。此外，该插件还会生成一个 `contentIndex.json` 全站索引文件，供客户端的全文搜索和关系图谱等动态组件使用。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `enableSiteMap`：若为 `true`（默认值），生成 `sitemap.xml` 站点地图，列出所有公开 URL 以供搜索引擎爬取。
- `enableRSS`：若为 `true`（默认值），生成包含最近更新内容的 RSS 订阅文件（`index.xml`）。
- `rssLimit`：RSS 订阅中包含的最大条目数量。默认为 `10`。
- `rssFullHtml`：若为 `true`，RSS 订阅中会直接包含每篇文章完整渲染后的 HTML 全文内容。默认为 `false`。
- `rssSlug`：生成的 RSS 订阅 XML 文件名 Slug。默认为 `"index"`（即输出 `index.xml`）。
- `includeEmptyFiles`：若为 `true`（默认值），正文为空的内容文件也会被包含在索引和资源中。

## API

- 类别：发射器（Emitter）
- 函数名：`ExternalPlugin.ContentIndex()`
- 源码：[`quartz-community/content-index`](https://github.com/quartz-community/content-index)
- 安装：`npx quartz plugin add github:quartz-community/content-index`
