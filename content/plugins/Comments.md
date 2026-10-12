---
title: Comments
description: "评论系统集成（Giscus、Utterances 等）。"
tags:
  - plugin/component
image: "[[giscus-results.png]]"
repository: "[quartz-community/comments](https://github.com/quartz-community/comments)"
enabled: false
required: false
---

第三方评论系统集成（目前支持 Giscus 等）。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/comments|评论功能详细指南]]。

## 配置选项

该插件接受以下配置选项：

- `provider`：采用的评论提供商，目前支持 `giscus`。
- `options`：提供商专属配置：
  - `repo`：用于存放评论讨论的 GitHub 仓库全名（`用户名/仓库名`）。
  - `repoId`：该 GitHub 仓库的专属 Node ID。
  - `category`：Discussions 讨论分类名称（建议选 `Announcements`）。
  - `categoryId`：该分类的专属 Category ID。
  - `lang`：评论区界面语言，默认为 `en`（可设为 `zh-CN`）。
  - `themeUrl`：自定义主题样式文件所在的 URL 目录。
  - `lightTheme`：浅色模式 CSS 样式文件名（默认为 `light`）。
  - `darkTheme`：深色模式 CSS 样式文件名（默认为 `dark`）。
  - `mapping`：页面与讨论串的映射规则（默认为 `url`）。
  - `strict`：是否启用严格标题匹配规则（默认为 `true`）。
  - `reactionsEnabled`：是否允许主帖表情反应 Reaction（默认为 `true`）。
  - `inputPosition`：评论输入框放置位置（`top` 顶部或 `bottom` 底部，默认 `bottom`）。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/comments
  enabled: true
  options:
    provider: giscus
    options:
      repo: jackyzha0/quartz
      repoId: MDEwOlJlcG9zaXRvcnkzODcyMTMyMDg
      category: Announcements
      categoryId: DIC_kwDOFxRnmM4B-Xg6
      lang: zh-CN
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Comments()`
- 源码：[`quartz-community/comments`](https://github.com/quartz-community/comments)
- 安装：`npx quartz plugin add github:quartz-community/comments`
