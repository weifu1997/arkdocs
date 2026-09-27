---
title: ContentPage
description: 为 Markdown 内容生成 HTML 页面。
tags:
  - plugin/pageType
image:
repository: "[quartz-community/content-page](https://github.com/quartz-community/content-page)"
enabled: true
required: false
---

This plugin is a page type plugin for the Quartz framework. It generates the HTML pages for each piece of Markdown content. It emits the full-page [[layout]], including headers, footers, and body content, among others. It uses the `default` [[layout#Page Frames|page frame]] (three-column layout with sidebars). It is now configured in the `pageTypes` section of `quartz.config.yaml`.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Page Type
- Function name: `ExternalPlugin.ContentPage()`.
- 源码： [`quartz-community/content-page`](https://github.com/quartz-community/content-page)
- 安装： `npx quartz plugin add github:quartz-community/content-page`
