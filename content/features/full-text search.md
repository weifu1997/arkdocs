---
title: 全文搜索
tags:
  - component
---

Quartz 的全文搜索由 [Flexsearch](https://github.com/nextapps-de/flexsearch) 提供支持。即使站点规模达到约 50 万词，也能在 10 毫秒内返回搜索结果。

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

点击搜索栏，或按下 `⌘`/`ctrl` + `K`，即可打开搜索。每次查询会显示前 5 条结果。匹配的子词会被高亮，并摘录最相关的 30 个词。点击搜索结果会跳转到对应页面。

要按标签搜索内容，可以按下 `⌘`/`ctrl` + `shift` + `K`，或让查询以 `#` 开头（例如 `#components`）。

该组件也支持键盘操作：Tab 和 Shift+Tab 会在搜索结果中前后循环，Enter 会跳转到高亮结果（默认是第一条）。也可以使用 `ArrowUp` 和 `ArrowDown` 浏览搜索结果。

> [!info]
> 搜索需要 [[configuration|配置]] 中存在 `ContentIndex` 生成器插件。

### 索引行为

默认会索引站点上的每个页面，并**去掉 Markdown 语法**。例如链接 URL 不会被索引。

它能正确分词中文、韩文和日文字符，并为标题、内容和标签分别构建索引，标题匹配的权重高于内容匹配。

## 自定义

- 移除搜索：从 `quartz.config.yaml` 中删除 `search` 条目，或设置 `enabled: false`。
- 安装： `npx quartz plugin add github:quartz-community/search`
- 源码： [`quartz-community/search`](https://github.com/quartz-community/search)
