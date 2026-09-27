---
title: PageTitle
description: 将站点标题渲染为返回首页的链接。
tags:
  - plugin/component
image:
repository: "[quartz-community/page-title](https://github.com/quartz-community/page-title)"
enabled: true
required: false
---

This plugin renders the site-wide page title (configured via the `pageTitle` field in [[configuration]]) as a clickable link to the home page. It typically appears in the left sidebar.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options. The displayed title is controlled by the `pageTitle` field in `quartz.config.yaml`.

## API

- Category: Component
- Function name: `ExternalPlugin.PageTitle()`.
- 源码： [`quartz-community/page-title`](https://github.com/quartz-community/page-title)
- 安装： `npx quartz plugin add github:quartz-community/page-title`
