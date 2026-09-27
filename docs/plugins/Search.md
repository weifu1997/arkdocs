---
title: Search
description: 支持标签筛选和键盘导航的全文搜索。
tags:
  - plugin/component
image: https://images.unsplash.com/photo-1516382799247-87df95d790b7
repository: "[quartz-community/search](https://github.com/quartz-community/search)"
enabled: true
required: false
---

Full-text search functionality.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[full-text search]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `enablePreview`: Whether to show a preview of the page content in search results. Defaults to `true`.
- `fieldPriority`: An array specifying the priority order for search fields. Defaults to `["title", "content", "tags"]`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/search
  enabled: true
  options:
    enablePreview: true
    fieldPriority:
      - title
      - content
      - tags
```

## API

- Category: Component
- Function name: `ExternalPlugin.Search()`.
- 源码： [`quartz-community/search`](https://github.com/quartz-community/search)
- 安装： `npx quartz plugin add github:quartz-community/search`
