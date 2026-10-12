---
title: 插件列表索引
image:
---

Quartz 的丰富功能由一系列官方与社区插件共同提供。每个插件均可通过 `quartz.config.yaml` 轻松启用、禁用和配置。关于插件的管理方法请参阅 [[configuration#插件体系（Plugins）|配置]]。

> [!info] 内部插件与社区插件
> Quartz 包含两类插件：
>
> - **社区插件**：属于 [`quartz-community`](https://github.com/quartz-community) GitHub 组织下的独立开源仓库。在 TypeScript 代码级覆盖中，使用 `ExternalPlugin.插件名()`（从 `.quartz/plugins` 导入）。
> - **内部插件**：随 Quartz 核心库内置的基础插件（如 Assets、Static、ComponentResources、NotFoundPage）。在 TypeScript 代码级覆盖中，使用 `Plugin.插件名()`（从 `./quartz/plugins` 导入）。

## 插件分类

Quartz 插件主要分为以下几大类别：

- **转换器（Transformers）**：在构建过程中处理与加工内容，例如解析 Frontmatter 元数据、代码语法高亮或解析双链。
- **过滤器（Filters）**：决定哪些内容文件应当包含在公开输出中，哪些应当剔除（如草稿或私有页面）。
- **页面类型（Page Types）**：生成特定格式的 HTML 页面——对应每个内容笔记、文件夹归档、标签归档、Canvas 白板或 Bases 数据库视图。
- **组件（Components）**：在页面布局插槽中渲染可视化交互界面元素（侧边栏、顶栏、底栏、浮层等）。
- **发射器（Emitters）**：归约汇总并输出全站静态资源文件（RSS 订阅、Sitemap、别名重定向、标签归档等）。

## 官方插件总览

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
    if(file.hasTag("plugin/transformer"), "转换器 (Transformer)",
    if(file.hasTag("plugin/filter"), "过滤器 (Filter)",
    if(file.hasTag("plugin/pageType"), "页面类型 (Page Type)",
    if(file.hasTag("plugin/emitter"), "发射器 (Emitter)",
    if(file.hasTag("plugin/component"), "组件 (Component)",
    "其他")))))
properties:
  title:
    displayName: 插件名称
  repository:
    displayName: 仓库地址
  enabled:
    displayName: 默认启用
  required:
    displayName: 核心必需
  description:
    displayName: 功能说明
views:
  - type: table
    name: 全部插件
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
    name: 转换器 (Transformers)
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
    name: 过滤器 (Filters)
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
    name: 页面类型 (Page Types)
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
    name: 发射器 (Emitters)
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
    name: 组件 (Components)
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

> [!note] 多类别插件说明
> 部分插件同时跨越多个类别。例如 **TableOfContents** 既是转换器又是组件；**EncryptedPages** 同时具备转换器、发射器和组件的能力。它们会出现在上方各自对应的视图分类中。
