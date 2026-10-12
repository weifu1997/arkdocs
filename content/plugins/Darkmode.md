---
title: Darkmode
description: "在亮色模式与深色模式之间一键平滑切换。"
tags:
  - plugin/component
image: "#0052cc"
repository: "[quartz-community/darkmode](https://github.com/quartz-community/darkmode)"
enabled: true
required: false
---

深色模式（Dark mode）切换开关组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/darkmode|深色模式详细文档]]。

## 配置

该插件接受以下配置选项：

- `enabled`：是否在页面上启用深色模式切换开关。默认为 `true`。

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/darkmode
  enabled: true
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Darkmode()`
- 源码：[`quartz-community/darkmode`](https://github.com/quartz-community/darkmode)
- 安装：`npx quartz plugin add github:quartz-community/darkmode`
