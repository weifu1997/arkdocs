---
title: Backlinks
description: 显示链接到当前页面的页面。
tags:
  - plugin/component
image:
repository: "[quartz-community/backlinks](https://github.com/quartz-community/backlinks)"
enabled: true
required: false
---

Shows pages that link to the current page.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[plugins/Backlinks]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `hideWhenEmpty`: Hide the backlinks section if the current page has no backlinks. Defaults to `true`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/backlinks
  enabled: true
  options:
    hideWhenEmpty: true
```

## API

- Category: Component
- Function name: `ExternalPlugin.Backlinks()`.
- 源码： [`quartz-community/backlinks`](https://github.com/quartz-community/backlinks)
- 安装： `npx quartz plugin add github:quartz-community/backlinks`
