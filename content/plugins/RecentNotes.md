---
title: RecentNotes
description: "根据筛选和排序规则自动生成最近更新或发布的笔记列表。"
tags:
  - plugin/component
image:
repository: "[quartz-community/recent-notes](https://github.com/quartz-community/recent-notes)"
enabled: false
required: false
---

生成最近更新或发布的笔记列表组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/recent notes|最近笔记功能详细指南]]。

## 配置选项

该插件接受以下配置选项：

- `title`：最近笔记区块展示的标题文本。默认为 `"Recent notes"`。
- `limit`：要列出的最近笔记最大篇数。默认为 `3`。
- `showTags`：是否同时展示各篇笔记的 Tags 标签。默认为 `true`。
- `linkToMore`：用于引导“查看更多”的完整页面 Slug 路径。默认为 `false`。
- `hideTagPages`：是否自动从列表中排除隐藏标签归档页。默认为 `false`。
- `hideFolderPages`：是否自动从列表中排除隐藏目录索引页。默认为 `false`。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/recent-notes
  enabled: true
  options:
    limit: 3
    showTags: true
    hideTagPages: false
    hideFolderPages: false
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.RecentNotes()`
- 源码：[`quartz-community/recent-notes`](https://github.com/quartz-community/recent-notes)
- 安装：`npx quartz plugin add github:quartz-community/recent-notes`
