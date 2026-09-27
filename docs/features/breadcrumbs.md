---
title: 面包屑导航
tags:
  - component
---

Breadcrumbs provide a way to navigate a hierarchy of pages within your site using a list of its parent folders.

By default, the element at the very top of your page is the breadcrumb navigation bar (can also be seen at the top on this page!).

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 自定义

Most configuration can be done via the `options` section of the breadcrumbs plugin entry in `quartz.config.yaml`.

For example, here's what the default configuration looks like:

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/breadcrumbs
    enabled: true
    options:
      spacerSymbol: "❯"
      rootName: Home
      resolveFrontmatterTitle: true
      showCurrentPage: true
    layout:
      position: beforeBody
      priority: 5
```

For the TS override approach:

```ts title="quartz.ts (override)"
// Must be placed before loadQuartzConfig()
ExternalPlugin.Breadcrumbs({
  spacerSymbol: "❯",
  rootName: "Home",
  resolveFrontmatterTitle: true,
  showCurrentPage: true,
})
```

When passing in your own options, you can omit any or all of these fields if you'd like to keep the default value for that field.

You can also adjust where the breadcrumbs will be displayed by changing the `layout.position` field in the plugin entry in `quartz.config.yaml` (see [[layout]]).

Want to customize it even more?

- Removing breadcrumbs: remove the `breadcrumbs` entry from `quartz.config.yaml` or set `enabled: false`.
- 安装： `npx quartz plugin add github:quartz-community/breadcrumbs`
- 源码： [`quartz-community/breadcrumbs`](https://github.com/quartz-community/breadcrumbs)
