---
title: RSS 订阅
---

Quartz 会为站点上的所有内容生成 RSS 订阅，方式是生成 RSS 阅读器可以订阅的 `index.xml` 文件。由于 RSS 规范的要求，需要在 [[configuration|配置]] 中正确设置 `baseUrl`，RSS 阅读器才能正常识别。

> [!info]
> After deploying, the generated RSS link will be available at `https://${baseUrl}/index.xml` by default.
>
> The `index.xml` path can be customized by passing the `rssSlug` option to the [[ContentIndex]] plugin.

## 配置

This functionality is provided by the [[ContentIndex]] plugin. See the plugin page for customization options.
