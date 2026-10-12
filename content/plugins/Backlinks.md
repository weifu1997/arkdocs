---
title: Backlinks
description: "展示反向链接到当前页面的所有笔记列表。"
tags:
  - plugin/component
image:
repository: "[quartz-community/backlinks](https://github.com/quartz-community/backlinks)"
enabled: true
required: false
---

展示反向链接（Backlinks）到当前页面的所有笔记列表。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/backlinks|反向链接功能文档]]。

## 配置

该插件接受以下配置选项：

- `hideWhenEmpty`：当当前页面没有任何反向链接时，是否自动隐藏反向链接区域。默认为 `true`。

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/backlinks
  enabled: true
  options:
    hideWhenEmpty: true
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Backlinks()`
- 源码：[`quartz-community/backlinks`](https://github.com/quartz-community/backlinks)
- 安装：`npx quartz plugin add github:quartz-community/backlinks`
