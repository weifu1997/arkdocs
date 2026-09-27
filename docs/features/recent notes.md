---
title: 最近笔记
tags: component
---

Quartz 可以根据过滤和排序条件生成最近笔记列表。该组件默认不会出现在任何 [[layout|布局]] 中，但你可以通过安装插件并在 `quartz.config.yaml` 中配置来添加它。

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 自定义

Most options are configured in the `options` section of the plugin entry in `quartz.config.yaml`:

- Changing the title from "Recent notes": set `title: "Recent writing"` in options
- Changing the number of recent notes: set `limit: 5` in options
- Display the note's tags (defaults to true): set `showTags: false` in options
- Hide generated tag pages from the list (defaults to false): set `hideTagPages: true` in options. This filters out any page whose slug lives under the conventional `tags/` prefix.
- Hide generated folder index pages from the list (defaults to false): set `hideFolderPages: true` in options. This filters out any page whose slug matches Quartz's folder-path convention (trailing slash or `index` suffix).
- Show a 'see more' link: set `linkToMore: "tags/components"` in options. This field should be a full slug to a page that exists.
- Customize filtering: requires a TS override — pass `filter: someFilterFunction` to the plugin constructor in `quartz.ts`. The filter function should have the signature `(f: QuartzPluginData) => boolean`.
- Customize sorting: requires a TS override — pass `sort: someSortFunction` to the plugin constructor in `quartz.ts`. By default, Quartz will sort by date and then tie break lexographically. The sort function should have the signature `(f1: QuartzPluginData, f2: QuartzPluginData) => number`.
- 安装： `npx quartz plugin add github:quartz-community/recent-notes`
- 源码： [`quartz-community/recent-notes`](https://github.com/quartz-community/recent-notes)
