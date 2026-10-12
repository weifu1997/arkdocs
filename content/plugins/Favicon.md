---
title: Favicon
description: "将站点图标自动裁切并输出为标准 favicon.ico 图标文件。"
tags:
  - plugin/emitter
image:
repository: "[quartz-community/favicon](https://github.com/quartz-community/favicon)"
enabled: true
required: false
---

该插件负责在 `public` 输出目录下生成标准的 `favicon.ico` 站点图标。它会自动读取位于 `quartz/static` 文件夹中的 `icon.png` 图片，并自动将其裁切缩放为 48x48px，确保体积极其轻巧。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：发射器（Emitter）
- 函数名：`ExternalPlugin.Favicon()`
- 源码：[`quartz-community/favicon`](https://github.com/quartz-community/favicon)
- 安装：`npx quartz plugin add github:quartz-community/favicon`
