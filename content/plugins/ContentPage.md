---
title: ContentPage
description: "为 Markdown 内容生成标准的 HTML 文章页面。"
tags:
  - plugin/pageType
image:
repository: "[quartz-community/content-page](https://github.com/quartz-community/content-page)"
enabled: true
required: false
---

该插件是 Quartz 框架最核心的页面类型插件，负责将每一篇 Markdown 笔记渲染为完整的 HTML 网页。它会输出包含顶栏、页脚、侧边栏以及正文在内的完整页面[[layout|布局（Layout）]]。默认采用 `default` [[layout#页面框架（Page Frames）|页面框架]]（三栏布局）。在 `quartz.config.yaml` 的 `pageTypes` 区域进行统一管理。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：页面类型（Page Type）
- 函数名：`ExternalPlugin.ContentPage()`
- 源码：[`quartz-community/content-page`](https://github.com/quartz-community/content-page)
- 安装：`npx quartz plugin add github:quartz-community/content-page`
