---
title: Assets
tags:
  - plugin/emitter
image: https://images.unsplash.com/photo-1526304640581-d334cdbbf45e
---

This plugin emits all non-Markdown static assets in your content folder (like images, videos, HTML, etc). The plugin respects the `ignorePatterns` in the global [[configuration]].

Note that all static assets will then be accessible through its path on your generated site, i.e: `host.me/path/to/static.pdf`

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Emitter
- Function name: `Plugin.Assets()` (internal plugin).
- 源码： [`quartz/plugins/emitters/assets.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/emitters/assets.ts).
