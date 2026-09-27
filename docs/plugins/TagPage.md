---
title: TagPage
description: 为标签生成列表页面。
tags:
  - plugin/pageType
image:
repository: "[quartz-community/tag-page](https://github.com/quartz-community/tag-page)"
enabled: true
required: false
---

This plugin is a page type plugin that emits dedicated pages for each tag used in the content. It uses the `default` [[layout#Page Frames|page frame]] (three-column layout with sidebars). See [[folder and tag listings]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `numPages`: The maximum number of pages to display per tag before showing a "see more" link. Defaults to `10`.
- `sort`: A function of type `(f1: QuartzPluginData, f2: QuartzPluginData) => number{:ts}` used to sort entries. Defaults to sorting by date and tie-breaking on lexographical order. Requires a TS override.
- `prefixTags`: If `true`, generated tag page titles are prefixed with "Tag: " (e.g. "Tag: recipes"). Defaults to `false`.

## API

- Category: Page Type
- Function name: `ExternalPlugin.TagPage()`.
- 源码： [`quartz-community/tag-page`](https://github.com/quartz-community/tag-page)
- 安装： `npx quartz plugin add github:quartz-community/tag-page`
