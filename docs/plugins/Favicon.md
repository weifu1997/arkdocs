---
title: Favicon
description: 输出站点图标。
tags:
  - plugin/emitter
image:
repository: "[quartz-community/favicon](https://github.com/quartz-community/favicon)"
enabled: true
required: false
---

This plugin emits a `favicon.ico` into the `public` folder. It creates the favicon from `icon.png` located in the `quartz/static` folder.
The plugin resizes `icon.png` to 48x48px to make it as small as possible.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Emitter
- Function name: `ExternalPlugin.Favicon()`.
- 源码： [`quartz-community/favicon`](https://github.com/quartz-community/favicon)
- 安装： `npx quartz plugin add github:quartz-community/favicon`
