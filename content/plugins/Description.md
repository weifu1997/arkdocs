---
title: Description
description: "为元数据、RSS 订阅和卡片预览自动生成文章摘要描述。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/description](https://github.com/quartz-community/description)"
enabled: true
required: false
---

该插件负责提取并生成页面描述文本，用于 HTML `<head>` 元数据、[[features/RSS Feed|RSS 订阅源]] 以及在[[features/folder and tag listings|文件夹与标签聚合页]]上作为文章列表的预览摘要。

如果当前文档的 Frontmatter 中包含显式的 `description` 字段，则直接使用该字段（详见 [[authoring content#语法|撰写内容语法]]）。否则，该插件会自动截取正文前几句话，智能提取出符合目标长度的优雅摘要。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `descriptionLength`：生成的描述摘要的目标字符长度。默认值为 150 个字符。截断会在达到目标长度后的第一个完整句末发生，保证句子通顺。
- `maxDescriptionLength`：描述摘要的绝对硬性最大长度上限。若超出则直接以省略号截断。默认值为 300 个字符。
- `replaceExternalLinks`：若为 `true`（默认值），将摘要中的外部长 URL 替换为其核心域名和路径（例如将 `https://domain.tld/page?query=123` 替换为 `domain.tld/page`），使摘要更美观整洁。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.Description()`
- 源码：[`quartz-community/description`](https://github.com/quartz-community/description)
- 安装：`npx quartz plugin add github:quartz-community/description`
