---
title: 目录
tags:
  - component
  - feature/transformer
---

Quartz 可以根据每页的标题列表自动生成目录。它还会用不同颜色高亮你已经滚过的标题，从而显示当前滚动位置。

要在某个页面隐藏目录，请在该页的 frontmatter 中添加 `enableToc: false`。

默认情况下，目录会显示从 H1（`# 标题`）到 H3（`### 标题`）的所有标题，并且只有在页面上有超过一个标题时才会显示。

## 自定义

目录功能由 [[TableOfContents]] 插件提供。更多自定义选项见该插件页面。

它还需要 `TableOfContents` 组件，该组件默认显示在右侧边栏。你可以通过自定义 [[layout|布局]] 来更改位置。目录组件可以通过 `layout` 参数配置，取值为 `modern`（默认）或 `legacy`。
