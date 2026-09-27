---
title: ExplicitPublish
description: 仅发布明确标记为 publish: true 的页面。
tags:
  - plugin/filter
image:
repository: "[quartz-community/explicit-publish](https://github.com/quartz-community/explicit-publish)"
enabled: false
required: false
---

This plugin filters content based on an explicit `publish` flag in the frontmatter, allowing only content that is explicitly marked for publication to pass through. It's the opt-in version of [[RemoveDrafts]]. See [[private pages]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Filter
- Function name: `ExternalPlugin.ExplicitPublish()`.
- 源码： [`quartz-community/explicit-publish`](https://github.com/quartz-community/explicit-publish)
- 安装： `npx quartz plugin add github:quartz-community/explicit-publish`
