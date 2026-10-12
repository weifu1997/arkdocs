---
title: ReaderMode
description: "提供一键隐藏侧边栏与干扰元素的专注沉浸式阅读模式切换开关。"
tags:
  - plugin/component
image:
new-in-v5: true
repository: "[quartz-community/reader-mode](https://github.com/quartz-community/reader-mode)"
enabled: true
required: false
---

无干扰沉浸式阅读模式（Reader Mode）切换开关组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/reader mode|阅读模式详细指南]]。

## 配置

该插件接受以下配置选项：

- `enabled`：是否在页面上启用阅读模式切换按钮。默认为 `true`。

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/reader-mode
  enabled: true
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.ReaderMode()`
- 源码：[`quartz-community/reader-mode`](https://github.com/quartz-community/reader-mode)
- 安装：`npx quartz plugin add github:quartz-community/reader-mode`
