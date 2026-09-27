---
title: ContentMeta
description: 显示创建日期和阅读时间。
tags:
  - plugin/component
image:
repository: "[quartz-community/content-meta](https://github.com/quartz-community/content-meta)"
enabled: true
required: false
---

This plugin displays content metadata below the article title, such as the creation date and estimated reading time.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 配置

该插件接受以下配置选项：

- `showReadingTime`: Whether to display the estimated reading time. Defaults to `true`.
- `showComma`: Whether to display a comma between metadata items. Defaults to `true`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/content-meta
  enabled: true
  options:
    showReadingTime: true
    showComma: true
```

## API

- Category: Component
- Function name: `ExternalPlugin.ContentMeta()`.
- 源码： [`quartz-community/content-meta`](https://github.com/quartz-community/content-meta)
- 安装： `npx quartz plugin add github:quartz-community/content-meta`
