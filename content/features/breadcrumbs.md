---
title: 面包屑导航
tags:
  - component
---

面包屑导航（Breadcrumbs）通过展示当前文章所在的上级文件夹层级路径，帮助访客快速理解页面所处位置并在上下级目录间轻松跳转。

默认情况下，位于正文内容最顶端的横向路径栏即是面包屑导航栏。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 自定义配置

绝大多数配置都可以通过 `quartz.config.yaml` 中面包屑插件条目的 `options` 部分直接完成。

默认推荐配置如下：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/breadcrumbs
    enabled: true
    options:
      spacerSymbol: "❯" # 层级之间的分隔符符号
      rootName: 首页 # 根目录主页的展示名称
      resolveFrontmatterTitle: true # 是否优先从各文件夹 index.md 的 Frontmatter 解析标题
      showCurrentPage: true # 是否在导航末尾展示当前页面的标题
    layout:
      position: beforeBody
      priority: 5
```

如果采用 `quartz.ts` 代码级 TS 覆盖方式：

```ts title="quartz.ts (覆盖配置)"
// 必须放置在 loadQuartzConfig() 之前
ExternalPlugin.Breadcrumbs({
  spacerSymbol: "❯",
  rootName: "首页",
  resolveFrontmatterTitle: true,
  showCurrentPage: true,
})
```

如果想要保留某项字段的默认值，直接在配置中省略该字段即可。

你还可以通过修改 `quartz.config.yaml` 插件条目中的 `layout.position` 字段来自由调整面包屑显示在页面中的位置（详见 [[layout|页面布局]]）。

更多管理方式：

- **移除面包屑**：从 `quartz.config.yaml` 中删除 `breadcrumbs` 条目，或将其设为 `enabled: false`。
- **安装插件**：`npx quartz plugin add github:quartz-community/breadcrumbs`
- **插件源码**：[`quartz-community/breadcrumbs`](https://github.com/quartz-community/breadcrumbs)
