---
title: Footer
description: 带可配置链接的页脚。
tags:
  - plugin/component
image:
repository: "[quartz-community/footer](https://github.com/quartz-community/footer)"
enabled: true
required: false
---

This plugin renders a footer at the bottom of the page with a "Created with Quartz" message and a set of configurable links.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 配置

该插件接受以下配置选项：

- `links`: A map of link labels to their URLs to display in the footer. Defaults to `{}`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/footer
  enabled: true
  options:
    links:
      GitHub: https://github.com/jackyzha0/quartz
      Discord Community: https://discord.gg/cRFFHYye7t
```

## API

- Category: Component
- Function name: `ExternalPlugin.Footer()`.
- 源码： [`quartz-community/footer`](https://github.com/quartz-community/footer)
- 安装： `npx quartz plugin add github:quartz-community/footer`
