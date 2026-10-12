---
title: Footer
description: "在页面底部渲染带有自定义超链接的页脚组件。"
tags:
  - plugin/component
image:
repository: "[quartz-community/footer](https://github.com/quartz-community/footer)"
enabled: true
required: false
---

该插件负责在页面底部渲染页脚组件，展示版权信息以及一组可自定义的外部社交或导航链接。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 配置

该插件接受以下配置选项：

- `links`：要在页脚展示的链接文本与 URL 映射表。默认为 `{}`。

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/footer
  enabled: true
  options:
    links:
      GitHub: https://github.com/jackyzha0/quartz
      Discord 社区: https://discord.gg/cRFFHYye7t
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Footer()`
- 源码：[`quartz-community/footer`](https://github.com/quartz-community/footer)
- 安装：`npx quartz plugin add github:quartz-community/footer`
