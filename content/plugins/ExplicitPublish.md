---
title: ExplicitPublish
description: "仅发布在 Frontmatter 中明确标记为 publish: true 的白名单页面。"
tags:
  - plugin/filter
image:
repository: "[quartz-community/explicit-publish](https://github.com/quartz-community/explicit-publish)"
enabled: false
required: false
---

该插件基于 Frontmatter 中的 `publish` 显式标识进行内容筛选，仅允许明确标记发布的内容通过并输出。它是 [[RemoveDrafts]] 草稿过滤插件的“白名单选择性加入”版本。详情请参阅 [[features/private pages|私有页面与草稿过滤]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：过滤器（Filter）
- 函数名：`ExternalPlugin.ExplicitPublish()`
- 源码：[`quartz-community/explicit-publish`](https://github.com/quartz-community/explicit-publish)
- 安装：`npx quartz plugin add github:quartz-community/explicit-publish`
