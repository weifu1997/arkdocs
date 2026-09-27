---
title: Description
description: 为元数据和预览生成页面描述。
tags:
  - plugin/transformer
image:
repository: "[quartz-community/description](https://github.com/quartz-community/description)"
enabled: true
required: false
---

This plugin generates descriptions that are used as metadata for the HTML `head`, the [[RSS Feed]] and in [[folder and tag listings]] if there is no main body content, the description is used as the text between the title and the listing.

If the frontmatter contains a `description` property, it is used (see [[authoring content#Syntax]]). Otherwise, the plugin will do its best to use the first few sentences of the content to reach the target description length.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `descriptionLength`: the target length of the generated description. Default is 150 characters. The cut off happens after the first _sentence_ that ends after the given length.
- `maxDescriptionLength`: the hard maximum length of the description. If the generated description exceeds this, it is truncated with an ellipsis. Default is 300 characters.
- `replaceExternalLinks`: If `true` (default), replace external links with their domain and path in the description (e.g. `https://domain.tld/some_page/another_page?query=hello&target=world` is replaced with `domain.tld/some_page/another_page`).

## API

- Category: Transformer
- Function name: `ExternalPlugin.Description()`.
- 源码： [`quartz-community/description`](https://github.com/quartz-community/description)
- 安装： `npx quartz plugin add github:quartz-community/description`
