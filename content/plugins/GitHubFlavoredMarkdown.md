---
title: GitHubFlavoredMarkdown
description: "全面支持 GitHub Flavored Markdown 规范（表格、任务列表、脚注、删除线）。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/github-flavored-markdown](https://github.com/quartz-community/github-flavored-markdown)"
enabled: true
required: false
---

该插件增强 Markdown 语法解析，全面支持 GitHub Flavored Markdown (GFM) 标准规范，包括自动识别 URL 链接、脚注、删除线文本、Markdown 表格以及任务待办列表等特性。

此外，该插件还支持可选的排版优化增强（SmartyPants，如将直引号转换为弯引号、连字符转换为破折号 en-dash/em-dash 等），并在鼠标悬停各级小标题时自动显示锚点链接图标。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `enableSmartyPants`：若为 `true`（默认值），启用西文标点排版增强。
- `linkHeadings`：若为 `true`（默认值），自动在小标题旁生成锚点悬停链接符号。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.GitHubFlavoredMarkdown()`
- 源码：[`quartz-community/github-flavored-markdown`](https://github.com/quartz-community/github-flavored-markdown)
- 安装：`npx quartz plugin add github:quartz-community/github-flavored-markdown`
