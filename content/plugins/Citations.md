---
title: Citations
description: "通过 BibTeX 提供学术引用与参考文献列表支持。"
tags:
  - plugin/transformer
image: https://images.unsplash.com/photo-1582079133805-43655f026448
repository: "[quartz-community/citations](https://github.com/quartz-community/citations)"
enabled: false
required: false
---

该插件为 Quartz 扩展了学术引用与文献索引解析能力。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `bibliographyFile`：参考文献 BibTeX 文件路径，相对于 Git 仓库根目录。默认为 `./bibliography.bib`。
- `suppressBibliography`：是否在文档末尾抑制并隐藏参考文献列表。默认为 `false`。
- `linkCitations`：是否将行内引用自动锚定并超链接至文末文献条目。默认为 `false`。
- `csl`：采用的文献引用格式风格。默认为 `apa`（支持 IEEE、Chicago 等，可参考 [rehype-citation](https://rehype-citation.netlify.app/custom-csl)）。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.Citations()`
- 源码：[`quartz-community/citations`](https://github.com/quartz-community/citations)
- 安装：`npx quartz plugin add github:quartz-community/citations`
