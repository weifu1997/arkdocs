---
title: Assets
tags:
  - plugin/emitter
image: https://images.unsplash.com/photo-1526304640581-d334cdbbf45e
---

该插件负责将内容目录中的所有非 Markdown 静态资源文件（如图片、视频、音频、PDF、HTML 静态文件等）完整复制输出。该插件严格遵循全局 [[configuration|配置]] 中的 `ignorePatterns` 忽略规则。

请注意，所有输出的静态资产均可直接通过生成站点上的对应路径进行访问，例如：`host.me/path/to/static.pdf`。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：发射器（Emitter）
- 函数名：`Plugin.Assets()`（核心内部插件）
- 源码：[`quartz/plugins/emitters/assets.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/emitters/assets.ts)
