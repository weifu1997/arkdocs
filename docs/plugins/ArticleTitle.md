---
title: ArticleTitle
description: 将文章标题渲染为 h1 标题。
tags:
  - plugin/component
image:
repository: "[quartz-community/article-title](https://github.com/quartz-community/article-title)"
enabled: true
required: false
---

This plugin renders the article title from the page's frontmatter as an `<h1>` heading at the top of the page content. It reads the `title` field from frontmatter (falling back to the filename if no title is set).

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Component
- Function name: `ExternalPlugin.ArticleTitle()`.
- 源码： [`quartz-community/article-title`](https://github.com/quartz-community/article-title)
- 安装： `npx quartz plugin add github:quartz-community/article-title`
