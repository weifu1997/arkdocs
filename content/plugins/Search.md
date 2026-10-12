---
title: Search
description: "支持标签筛选与全键盘导航的毫秒级全文搜索组件。"
tags:
  - plugin/component
image: https://images.unsplash.com/photo-1516382799247-87df95d790b7
repository: "[quartz-community/search](https://github.com/quartz-community/search)"
enabled: true
required: false
---

全站全文搜索（Full-text search）交互组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/full-text search|全文搜索详细指南]]。

## 配置选项

该插件接受以下配置选项：

- `enablePreview`：是否在搜索结果下拉列表中展示上下文匹配摘录。默认为 `true`。
- `fieldPriority`：搜索匹配权重优先级数组。默认为 `["title", "content", "tags"]`（标题优先，其次为正文，最后为标签）。

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

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Search()`
- 源码：[`quartz-community/search`](https://github.com/quartz-community/search)
- 安装：`npx quartz plugin add github:quartz-community/search`
