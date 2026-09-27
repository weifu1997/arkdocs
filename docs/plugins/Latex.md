---
title: Latex
description: 通过 KaTeX 或 Typst 渲染 LaTeX 数学表达式。
tags:
  - plugin/transformer
image:
repository: "[quartz-community/latex](https://github.com/quartz-community/latex)"
enabled: true
required: false
---

This plugin adds LaTeX support to Quartz. See [[features/Latex|Latex]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `renderEngine`: the engine to use to render LaTeX equations. Can be `"katex"` for [KaTeX](https://katex.org/), `"mathjax"` for [MathJax](https://www.mathjax.org/) [SVG rendering](https://docs.mathjax.org/en/latest/output/svg.html), or `"typst"` for [Typst](https://typst.app/) (a new way to compose LaTeX equation). Defaults to KaTeX.
- `customMacros`: custom macros for all LaTeX blocks. It takes the form of a key-value pair where the key is a new command name and the value is the expansion of the macro. For example: `{"\\R": "\\mathbb{R}"}`
- `katexOptions`: Additional options passed to the KaTeX renderer. See the [KaTeX docs](https://katex.org/docs/options) for available options.
- `mathJaxOptions`: Additional options passed to the MathJax renderer. See the [MathJax docs](https://docs.mathjax.org/en/latest/options/) for available options.
- `typstOptions`: Additional options passed to the Typst renderer.

## API

- Category: Transformer
- Function name: `ExternalPlugin.Latex()`.
- 源码： [`quartz-community/latex`](https://github.com/quartz-community/latex)
- 安装： `npx quartz plugin add github:quartz-community/latex`
