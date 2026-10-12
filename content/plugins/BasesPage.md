---
title: BasesPage
description: "将 Obsidian Bases 文件渲染为类似数据库的交互式视图。"
tags:
  - plugin/pageType
  - plugin/component
image:
new-in-v5: true
repository: "[quartz-community/bases-page](https://github.com/quartz-community/bases-page)"
enabled: true
required: false
---

该插件为 Quartz 提供对 [Obsidian Bases](https://obsidian.md/changelog/2025-04-15-desktop-v1.8.0/)（`.base` 数据库文件）的原生渲染支持。它从你的知识库中读取 `.base` 文件，根据查询语句筛选匹配的笔记，并将其渲染为支持表格、列表、卡片和地图的多维数据库交互视图。默认采用 `default` [[layout#页面框架（Page Frames）|页面框架]]（经典带侧边栏的三栏布局）。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 功能特性

- **表格视图（Table）**：可排序列，带自动类型渲染（字符串、数字、布尔值、数组、双链）；
- **列表视图（List）**：紧凑列表展示，每条记录带有元数据徽章；
- **卡片视图（Cards）**：卡片排版布局，支持封面图片展示；
- **地图视图（Map）**：地理位置可视化支持；
- **多视图切换**：单个 `.base` 文件可定义多种视图，渲染为可自由切换的标签页；
- **筛选器（Filters）**：支持基于 `and` / `or` / `not` 操作符的递归嵌套过滤树；
- **计算公式（Formulas）**：通过表达式引擎计算动态属性；
- **聚合统计（Summaries）**：列级聚合运算（求和、平均值、最小/最大值、中位数等）；
- **链接与嵌入解析**：单元格内的双链与 Markdown 链接会自动渲染为可点击跳转的交互链接。

## 与私有未列出页面（Unlisted）的协作

`BasesPage` 严密遵守由 [[UnlistedPages]] 和 [[EncryptedPages]] 写入的 `file.data.unlisted` 约定。标记为 `unlisted: true` 的页面（或带有 `stealth: true` 的隐形加密页面）会自动从所有 Base 视图中排除，即便查询条件命中也不会展现。

> [!note] 服务端渲染说明
> Base 数据库视图是在**构建阶段（Build-time）**于服务端静态预渲染生成的 HTML。当访客在客户端解密某篇加密文章后，图谱、目录树和搜索会自动从内存中解锁更新，但 Base 视图在构建期就已经生成，因此未列出的页面不会动态插入，直至站点重新构建。

## 配置

该插件接受以下配置选项：

- `defaultViewType`：当 `.base` 文件未显式指定视图类型时的默认视图。默认为 `"table"`。
- `linkResolution`：视图渲染器解析内部链接的规则，应与 [[CrawlLinks]] 插件的 `markdownLinkResolution` 保持一致（可选 `"absolute"`、`"relative"`、`"shortest"`，默认 `"shortest"`）。
- `customViews`：自定义视图渲染器映射表。支持扩展全新的视图类型（需要 TS 代码覆盖）。

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/bases-page
  enabled: true
```

如需扩展自定义视图渲染器，在 `quartz.ts` 中使用 TS 代码覆盖：

```ts title="quartz.ts (覆盖配置)"
import * as ExternalPlugin from "./.quartz/plugins"

// 必须放置在 loadQuartzConfig() 之前
ExternalPlugin.BasesPage({
  defaultViewType: "table",
  customViews: {
    myView: ({ entries, view, basesData, total, locale }) => {
      // 返回自定义 Preact JSX
    },
  },
})
```

## API

- 类别：页面类型（Page Type）、组件（Component）
- 函数名：`ExternalPlugin.BasesPage()`
- 源码：[`quartz-community/bases-page`](https://github.com/quartz-community/bases-page)
- 安装：`npx quartz plugin add github:quartz-community/bases-page`
