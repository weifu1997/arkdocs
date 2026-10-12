---
title: ComponentResources
tags:
  - plugin/emitter
image:
---

该插件负责管理并输出 Quartz 核心所需的基础静态资源。这包括用于增强生成站点功能与美观度的核心 CSS 样式表和 JavaScript 脚本。另请参阅全局 [[configuration|配置]] 中 `theme` 区域下的 `cdnCaching` 选项。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：发射器（Emitter）
- 函数名：`Plugin.ComponentResources()`（核心内部插件）
- 源码：[`quartz/plugins/emitters/componentResources.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/emitters/componentResources.ts)
