---
title: Breadcrumbs
description: "面包屑层级导航路径组件。"
tags:
  - plugin/component
image:
repository: "[quartz-community/breadcrumbs](https://github.com/quartz-community/breadcrumbs)"
enabled: true
required: false
---

面包屑层级导航路径组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/breadcrumbs|面包屑导航详细指南]]。

## 配置

该插件接受以下配置选项：

- `spacerSymbol`：面包屑层级项之间的分隔符符号。默认为 `"❯"`。
- `rootName`：根目录首页的展示名称。默认为 `首页`。
- `resolveFrontmatterTitle`：是否优先读取各级目录 `index.md` 中的 `title` 元数据。默认为 `true`。
- `showCurrentPage`：是否在导航路径末尾展示当前页面的标题。默认为 `true`。

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/breadcrumbs
  enabled: true
  options:
    spacerSymbol: "❯"
    rootName: 首页
    resolveFrontmatterTitle: true
    showCurrentPage: true
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Breadcrumbs()`
- 源码：[`quartz-community/breadcrumbs`](https://github.com/quartz-community/breadcrumbs)
- 安装：`npx quartz plugin add github:quartz-community/breadcrumbs`
