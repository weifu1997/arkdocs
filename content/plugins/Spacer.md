---
title: Spacer
description: "用于在布局分组中弹性推开相邻组件的自适应间距组件。"
tags:
  - plugin/component
image:
new-in-v5: true
repository: "[quartz-community/spacer](https://github.com/quartz-community/spacer)"
enabled: true
required: false
---

该插件渲染一个弹性空白间隔元素，在布局分组内部将相邻的组件推开。它利用 CSS `flex: 2 1 auto` 自动填满剩余空间，在工具栏或侧边栏中非常实用（例如在左侧边栏工具栏中将搜索框与深色模式切换按钮隔开）。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Spacer()`
- 源码：[`quartz-community/spacer`](https://github.com/quartz-community/spacer)
- 安装：`npx quartz plugin add github:quartz-community/spacer`
