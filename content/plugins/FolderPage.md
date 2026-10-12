---
title: FolderPage
description: "为文件夹自动生成内容汇总与归档列表页面。"
tags:
  - plugin/pageType
image:
repository: "[quartz-community/folder-page](https://github.com/quartz-community/folder-page)"
enabled: true
required: false
---

该插件属于页面类型插件，负责为文件夹生成索引归档页，为包含多个内容文件的各个目录创建聚合列表。默认采用 `default` [[layout#Page Frames|页面框架]]（三栏布局）。详见 [[features/folder and tag listings|文件夹与标签列表]]。

例如：[[advanced/|进阶板块]]

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `showFolderCount`：是否在归档页上显示该文件夹内的文章总数。默认为 `true`。
- `showSubfolders`：列表聚合中是否包含各层级子文件夹内的文章。默认为 `true`。
- `sort`：类型为 `(f1: QuartzPluginData, f2: QuartzPluginData) => number{:ts}` 的自定义排序函数。默认按修改时间降序排列，时间相同时按字典序。需要通过 TS 代码覆盖方式配置。
- `prefixFolders`：若为 `true`，生成的文件夹标题会自动附带 "Folder: " 前缀（例如 "Folder: 笔记"）。默认为 `false`。

## API

- 类别：页面类型（Page Type）
- 函数名：`ExternalPlugin.FolderPage()`
- 源码：[`quartz-community/folder-page`](https://github.com/quartz-community/folder-page)
- 安装：`npx quartz plugin add github:quartz-community/folder-page`
