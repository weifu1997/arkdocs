---
title: PageTitle
description: "将站点全局标题渲染为返回首页的可点击交互链接。"
tags:
  - plugin/component
image:
repository: "[quartz-community/page-title](https://github.com/quartz-community/page-title)"
enabled: true
required: false
---

该插件将全站主标题（在全局 [[configuration|配置]] 的 `pageTitle` 字段中指定）渲染为点击即可返回网站首页的超链接，通常固定放置在左侧边栏顶端。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。所展示的标题完全由 `quartz.config.yaml` 中的 `pageTitle` 字段控制。

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.PageTitle()`
- 源码：[`quartz-community/page-title`](https://github.com/quartz-community/page-title)
- 安装：`npx quartz plugin add github:quartz-community/page-title`
