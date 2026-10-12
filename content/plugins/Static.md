---
title: Static
tags:
  - plugin/emitter
image:
---

该插件负责输出 Quartz 核心所需的所有固定静态资源。例如需要稳定物理路径的图标、字体和横幅图片等。该插件严格遵循全局 [[configuration|配置]] 中的 `ignorePatterns` 忽略规则。

> [!important] 与 Assets 插件的区别
> 本插件与 [[Assets]] 发射器不同：[[Static]] 插件输出的资源位于 `quartz/static` 下（如系统内置图标和样式脚本），而 [[Assets]] 处理的是用户在 `content` 文件夹中撰写内容时直接引用的个人图片、音视频和本地附件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：发射器（Emitter）
- 函数名：`Plugin.Static()`（核心内部插件）
- 源码：[`quartz/plugins/emitters/static.ts`](https://github.com/jackyzha0/quartz/blob/v5/quartz/plugins/emitters/static.ts)
