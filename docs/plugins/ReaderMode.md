---
title: ReaderMode
description: 减少干扰的阅读模式切换。
tags:
  - plugin/component
image:
new-in-v5: true
repository: "[quartz-community/reader-mode](https://github.com/quartz-community/reader-mode)"
enabled: true
required: false
---

Distraction-free reading mode.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[reader mode]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `enabled`: Whether to enable reader mode. Defaults to `true`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/reader-mode
  enabled: true
```

## API

- Category: Component
- Function name: `ExternalPlugin.ReaderMode()`.
- 源码： [`quartz-community/reader-mode`](https://github.com/quartz-community/reader-mode)
- 安装： `npx quartz plugin add github:quartz-community/reader-mode`
