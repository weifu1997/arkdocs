---
title: "Roam Research 兼容"
tags:
  - feature/transformer
---

[Roam Research](https://roamresearch.com) 是一款以网状图谱与块级互联为核心理念的双链笔记工具。

Quartz 通过 [[RoamFlavoredMarkdown]] 转换器插件，支持将来自 Roam Research 的特殊 Markdown 语法（如 `{{[[components]]}}` 等块宏及特殊排版）自动转换为标准 Markdown 语法。

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/roam
    enabled: true
    order: 25 # 必须在 obsidian-flavored-markdown 之前执行
  - source: github:quartz-community/obsidian-flavored-markdown
    enabled: true
    order: 30
```

如果采用 TS 覆盖方式，需置于 `quartz.ts` 的 `loadQuartzConfig()` 之前：

```ts title="quartz.ts (覆盖配置)"
import * as ExternalPlugin from "./.quartz/plugins"

ExternalPlugin.RoamFlavoredMarkdown()
```

> [!warning] 插件顺序提醒
> 在 YAML 中，插件执行次序由 `order` 字段决定。请确保 `roam` 的 `order` 数值小于 `obsidian-flavored-markdown`，以便其先于后者执行转换。

## 驱动插件

该特性由 [[RoamFlavoredMarkdown]] 插件提供。自定义选项请查阅该插件页面。
