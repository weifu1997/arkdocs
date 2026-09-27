---
title: RemoveDrafts
description: 过滤掉标记为草稿的页面。
tags:
  - plugin/filter
image:
repository: "[quartz-community/remove-draft](https://github.com/quartz-community/remove-draft)"
enabled: true
required: false
---

This plugin filters out content from your vault, so that only finalized content is made available. This prevents [[private pages]] from being published. By default, it filters out all pages with `draft: true` in the frontmatter and leaves all other pages intact.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Filter
- Function name: `ExternalPlugin.RemoveDrafts()`.
- 源码： [`quartz-community/remove-draft`](https://github.com/quartz-community/remove-draft)
- 安装： `npx quartz plugin add github:quartz-community/remove-draft`
