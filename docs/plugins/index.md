---
title: 插件
image:
---

Quartz 的功能由一系列官方社区插件提供。每个插件都可以通过 `quartz.config.yaml` 启用、禁用和配置。如何管理插件见 [[configuration#插件|配置]]。

> [!info] 内部插件与社区插件
> Quartz 有两类插件：
>
> - **社区插件** 是 [`quartz-community`](https://github.com/quartz-community) 下的独立仓库。在 TypeScript 覆盖中，它们使用 `ExternalPlugin.X()`（从 `.quartz/plugins` 导入）。
> - **内部插件** 内置于 Quartz 核心（Assets、Static、ComponentResources、NotFoundPage）。在 TypeScript 覆盖中，它们使用 `Plugin.X()`（从 `./quartz/plugins` 导入）。

## 插件类型

Quartz 插件分为几类：

- **转换器** 在构建过程中处理内容，例如解析 frontmatter、语法高亮或解析链接。
- **过滤器** 决定哪些内容文件会包含或排除在输出中。
- **页面类型** 生成 HTML 页面 — 每个内容文件、文件夹、标签、canvas 或 bases 视图对应一页。
- **组件** 在页面布局中渲染界面元素（侧边栏、页眉、页脚等）。

## 官方插件

```base
filters:
  and:
    - file.ext == "md"
    - file.inFolder("plugins")
    - "!file.name.startsWith('index')"
    - "!file.name.contains('Demo')"
    - "!file.name.contains('Static')"
    - "!file.name.contains('Assets')"
    - "!file.name.contains('ComponentResources')"
    - "!file.name.contains('NotFoundPage')"
formulas:
  category: |
    if(file.hasTag("plugin/transformer"), "Transformer",
    if(file.hasTag("plugin/filter"), "Filter",
    if(file.hasTag("plugin/pageType"), "Page Type",
    if(file.hasTag("plugin/emitter"), "Emitter",
    if(file.hasTag("plugin/component"), "Component",
    "Other")))))
properties:
  title:
    displayName: Plugin
  repository:
    displayName: Repository
  enabled:
    displayName: Enabled
  required:
    displayName: Required
  description:
    displayName: Description
views:
  - type: table
    name: All Plugins
    groupBy:
      property: formula.category
      direction: ASC
    order:
      - title
      - repository
      - enabled
      - required
      - description
    sort:
      - property: formula.category
        direction: ASC
      - property: title
        direction: ASC
  - type: table
    name: Transformers
    filters:
      and:
        - file.hasTag("plugin/transformer")
    order:
      - title
      - repository
      - enabled
      - required
      - description
    sort:
      - property: title
        direction: ASC
  - type: table
    name: Filters
    filters:
      and:
        - file.hasTag("plugin/filter")
    order:
      - title
      - repository
      - enabled
      - required
      - description
    sort:
      - property: title
        direction: ASC
  - type: table
    name: Page Types
    filters:
      and:
        - file.hasTag("plugin/pageType")
    order:
      - title
      - repository
      - enabled
      - required
      - description
    sort:
      - property: title
        direction: ASC
  - type: table
    name: Emitters
    filters:
      and:
        - file.hasTag("plugin/emitter")
    order:
      - title
      - repository
      - enabled
      - required
      - description
    sort:
      - property: title
        direction: ASC
  - type: table
    name: Components
    filters:
      and:
        - file.hasTag("plugin/component")
    order:
      - title
      - repository
      - enabled
      - required
      - description
    sort:
      - property: title
        direction: ASC

```

> [!note] Multi-category plugins
> Some plugins span multiple categories. **TableOfContents** is both a transformer and a component. **EncryptedPages** is a transformer, emitter, and component. They appear in each relevant category above.
