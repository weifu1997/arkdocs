---
title: 最近笔记
tags:
  - component
---

Quartz 支持根据筛选与排序规则自动生成“最近更新/发布的笔记”列表。该组件默认未出现在基础 [[layout|布局]] 中，但你可以通过在 `quartz.config.yaml` 中配置启用该插件将其添加到任意页面槽位。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 自定义配置

大多数常用选项可以直接在 `quartz.config.yaml` 插件条目的 `options` 部分进行设置：

- **修改列表标题**（默认为 "Recent notes"）：在 options 中设置 `title: "最近发布"`
- **限制展示数量**：在 options 中设置 `limit: 5`
- **是否展示笔记的标签 Tags**（默认为 true）：在 options 中设置 `showTags: false`
- **隐藏自动生成的标签索引页**（默认为 false）：在 options 中设置 `hideTagPages: true`。这会自动排除所有 slug 位于 `tags/` 前缀下的标签聚合页。
- **隐藏自动生成的文件夹索引页**（默认为 false）：在 options 中设置 `hideFolderPages: true`。这会自动排除结尾带斜杠或以 `index` 为后缀的目录页。
- **展示“查看更多”跳转链接**：在 options 中设置 `linkToMore: "tags/components"`。该字段应填写已存在的页面的完整 Slug 路径。
- **自定义过滤函数**：需要使用 TS 代码覆盖方式——在 `quartz.ts` 中向插件传入 `filter: 你的过滤函数`。函数签名为 `(f: QuartzPluginData) => boolean`。
- **自定义排序逻辑**：需要使用 TS 代码覆盖方式——在 `quartz.ts` 中传入 `sort: 你的排序函数`。默认情况下，Quartz 按修改时间降序排列，相同时间按字典序。排序函数签名为 `(f1: QuartzPluginData, f2: QuartzPluginData) => number`。
- **安装插件**：`npx quartz plugin add github:quartz-community/recent-notes`
- **插件源码**：[`quartz-community/recent-notes`](https://github.com/quartz-community/recent-notes)
