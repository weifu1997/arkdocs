---
title: Breadcrumbs
description: 面包屑导航路径。
tags:
  - plugin/component
image:
repository: "[quartz-community/breadcrumbs](https://github.com/quartz-community/breadcrumbs)"
enabled: true
required: false
---

Navigation breadcrumb trail.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[plugins/Breadcrumbs]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `spacerSymbol`: The symbol to use between breadcrumb items. Defaults to `"❯"`.
- `rootName`: The name of the root page. Defaults to `Home`.
- `resolveFrontmatterTitle`: Whether to use the `title` frontmatter field for breadcrumb items. Defaults to `true`.
- `showCurrentPage`: Whether to show the current page in the breadcrumb trail. Defaults to `true`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/breadcrumbs
  enabled: true
  options:
    spacerSymbol: "❯"
    rootName: Home
    resolveFrontmatterTitle: true
    showCurrentPage: true
```

## API

- Category: Component
- Function name: `ExternalPlugin.Breadcrumbs()`.
- 源码： [`quartz-community/breadcrumbs`](https://github.com/quartz-community/breadcrumbs)
- 安装： `npx quartz plugin add github:quartz-community/breadcrumbs`
