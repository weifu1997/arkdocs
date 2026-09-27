---
title: NotFoundPage
tags:
  - plugin/pageType
image:
---

This plugin emits a 404 (Not Found) page for broken or non-existent URLs. It uses the `minimal` [[layout#Page Frames|page frame]] (no sidebars, no header or beforeBody chrome — only content and footer) to present a clean error page.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Page Type
- Function name: `Plugin.NotFoundPage()` (internal plugin).
- 源码： [`quartz/plugins/pageTypes/404.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/pageTypes/404.ts)
