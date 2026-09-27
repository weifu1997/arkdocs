---
title: Static
tags:
  - plugin/emitter
image:
---

This plugin emits all static resources needed by Quartz. This is used, for example, for fonts and images that need a stable position, such as banners and icons. The plugin respects the `ignorePatterns` in the global [[configuration]].

> [!important]
> This is different from [[Assets]]. The resources from the [[Static]] plugin are located under `quartz/static`, whereas [[Assets]] renders all static resources under `content` and is used for images, videos, audio, etc. that are directly referenced by your markdown content.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Emitter
- Function name: `Plugin.Static()` (internal plugin).
- 源码： [`quartz/plugins/emitters/static.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/emitters/static.ts).
