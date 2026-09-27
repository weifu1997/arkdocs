---
title: Spacer
description: 用于布局分组的弹性间隔。
tags:
  - plugin/component
image:
new-in-v5: true
repository: "[quartz-community/spacer](https://github.com/quartz-community/spacer)"
enabled: true
required: false
---

This plugin renders a flexible spacer element that pushes adjacent components apart within a layout group. It uses CSS `flex: 2 1 auto` to fill available space, making it useful for spacing out items in toolbars or sidebars (for example, separating the search bar from the darkmode toggle in the left sidebar toolbar).

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Component
- Function name: `ExternalPlugin.Spacer()`.
- 源码： [`quartz-community/spacer`](https://github.com/quartz-community/spacer)
- 安装： `npx quartz plugin add github:quartz-community/spacer`
