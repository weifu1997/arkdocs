---
title: Darkmode
description: 在亮色和暗色主题之间切换。
tags:
  - plugin/component
image: "#0052cc"
repository: "[quartz-community/darkmode](https://github.com/quartz-community/darkmode)"
enabled: true
required: false
---

Dark mode toggle.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[plugins/Darkmode]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `enabled`: Whether to enable the dark mode toggle. Defaults to `true`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/darkmode
  enabled: true
```

## API

- Category: Component
- Function name: `ExternalPlugin.Darkmode()`.
- 源码： [`quartz-community/darkmode`](https://github.com/quartz-community/darkmode)
- 安装： `npx quartz plugin add github:quartz-community/darkmode`
