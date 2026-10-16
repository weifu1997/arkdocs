---
title: NotFoundPage
tags:
  - plugin/pageType
image:
---

该插件负责在输出目录生成用于处理死链或不存在路径的 404（页面未找到）错误页。它采用 `minimal` 极简[[layout#页面框架（Page Frames）|页面框架]]（无侧边栏、无顶栏，仅保留错误提示与页脚），呈现简洁清爽的错误引导。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：页面类型（Page Type）
- 函数名：`Plugin.NotFoundPage()`（核心内部插件）
- 源码：[`quartz/plugins/pageTypes/404.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/pageTypes/404.ts)
