---
title: Citations
description: 通过 BibTeX 提供学术引用和参考文献支持。
tags:
  - plugin/transformer
image: https://images.unsplash.com/photo-1582079133805-43655f026448
repository: "[quartz-community/citations](https://github.com/quartz-community/citations)"
enabled: false
required: false
---

This plugin adds Citation support to Quartz.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `bibliographyFile`: the path to the bibliography file. Defaults to `./bibliography.bib`. This is relative to git source of your vault.
- `suppressBibliography`: whether to suppress the bibliography at the end of the document. Defaults to `false`.
- `linkCitations`: whether to link citations to the bibliography. Defaults to `false`.
- `csl`: the citation style to use. Defaults to `apa`. Reference [rehype-citation](https://rehype-citation.netlify.app/custom-csl) for more options.

## API

- Category: Transformer
- Function name: `ExternalPlugin.Citations()`.
- 源码： [`quartz-community/citations`](https://github.com/quartz-community/citations)
- 安装： `npx quartz plugin add github:quartz-community/citations`
