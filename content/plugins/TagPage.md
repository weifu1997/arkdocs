---
title: TagPage
description: "为各个标签生成专属的内容汇总与归档聚合页面。"
tags:
  - plugin/pageType
image:
repository: "[quartz-community/tag-page](https://github.com/quartz-community/tag-page)"
enabled: true
required: false
---

该插件属于页面类型插件，负责为内容中使用的每个独立标签生成专属的聚合归档页。默认采用 `default` [[layout#页面框架（Page Frames）|页面框架]]（三栏布局）。详见 [[features/folder and tag listings|文件夹与标签列表]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `numPages`：在显示“查看更多”链接之前，每个标签列表默认展示的最大文章篇数。默认为 `10`。
- `sort`：类型为 `(f1: QuartzPluginData, f2: QuartzPluginData) => number{:ts}` 的自定义排序函数。默认按修改时间降序排列，相同时间按字典序。需要通过 TS 代码覆盖方式配置。
- `prefixTags`：若为 `true`，生成的标签页标题会自动附带 "Tag: " 前缀（例如 "Tag: 菜谱"）。默认为 `false`。

## API

- 类别：页面类型（Page Type）
- 函数名：`ExternalPlugin.TagPage()`
- 源码：[`quartz-community/tag-page`](https://github.com/quartz-community/tag-page)
- 安装：`npx quartz plugin add github:quartz-community/tag-page`
