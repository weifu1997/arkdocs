---
title: "RSS 订阅源"
tags:
  - feature
---

Quartz 会自动为站点上的所有内容生成 RSS 订阅源，在根目录下输出符合标准规范的 `index.xml` 文件，方便访客使用各种 RSS 阅读器（如 Feedly、Inoreader、NetNewsWire 等）进行实时订阅。

根据 RSS 国际标准规范的要求，请务必在 [[configuration|配置]] 中正确设置 `baseUrl`，以便订阅源能够输出正确的文章绝对链接。

> [!info] 访问地址
> 部署完成后，生成的 RSS 订阅地址默认为：`https://${baseUrl}/index.xml`。
>
> 你可以通过向 [[ContentIndex]] 插件传入 `rssSlug` 选项来自定义该 XML 文件的文件名及生成路径。

## 驱动插件

该特性由 [[ContentIndex]] 生成器插件提供。详细自定义选项请参阅该插件文档。
