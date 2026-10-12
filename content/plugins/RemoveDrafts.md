---
title: RemoveDrafts
description: "根据 Frontmatter 中的 draft: true 标记自动过滤并排除草稿页面。"
tags:
  - plugin/filter
image:
repository: "[quartz-community/remove-draft](https://github.com/quartz-community/remove-draft)"
enabled: true
required: false
---

该插件用于从知识库中过滤排除未定稿的草稿页面，确保仅发布已经完善的内容，防止私密草稿意外公开。默认情况下，它会自动剔除所有在 Frontmatter 中标记了 `draft: true` 的页面，保留其余正常文章。详见 [[features/private pages|私有页面与草稿过滤]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：过滤器（Filter）
- 函数名：`ExternalPlugin.RemoveDrafts()`
- 源码：[`quartz-community/remove-draft`](https://github.com/quartz-community/remove-draft)
- 安装：`npx quartz plugin add github:quartz-community/remove-draft`
