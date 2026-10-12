---
title: ContentMeta
description: "在文章标题下方展示创建时间、修改日期与预计阅读时长。"
tags:
  - plugin/component
image:
repository: "[quartz-community/content-meta](https://github.com/quartz-community/content-meta)"
enabled: true
required: false
---

该插件在文章大标题下方展示内容元数据，例如创建日期、最后修改时间以及预计阅读时长。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 配置选项

该插件接受以下配置选项：

- `showReadingTime`：是否展示预计阅读时间。默认为 `true`。
- `showComma`：是否在各个元数据小项之间展示分隔逗号或圆点。默认为 `true`。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/content-meta
  enabled: true
  options:
    showReadingTime: true
    showComma: true
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.ContentMeta()`
- 源码：[`quartz-community/content-meta`](https://github.com/quartz-community/content-meta)
- 安装：`npx quartz plugin add github:quartz-community/content-meta`
