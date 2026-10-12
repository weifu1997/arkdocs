---
title: ArticleTitle
description: "将文章标题渲染为 h1 一级标题。"
tags:
  - plugin/component
image:
repository: "[quartz-community/article-title](https://github.com/quartz-community/article-title)"
enabled: true
required: false
---

该插件从页面的 Frontmatter 中读取文章标题，并在页面正文顶部将其渲染为 `<h1>` 一级大标题。它优先读取 Frontmatter 中的 `title` 字段（如果未显式设置标题，则自动回退到当前文件名）。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.ArticleTitle()`
- 源码：[`quartz-community/article-title`](https://github.com/quartz-community/article-title)
- 安装：`npx quartz plugin add github:quartz-community/article-title`
