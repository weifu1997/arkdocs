---
title: Latex
description: "通过 KaTeX、MathJax 或 Typst 提供高性能 LaTeX 数学公式静态渲染。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/latex](https://github.com/quartz-community/latex)"
enabled: true
required: false
---

该插件为 Quartz 扩展了 LaTeX 数学公式解析与渲染能力。详情请参阅 [[features/Latex|LaTeX 公式详细指南]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `renderEngine`：用于渲染 LaTeX 公式所使用的底层引擎。可选 `"katex"`（使用 [KaTeX](https://katex.org/)）、`"mathjax"`（使用 [MathJax SVG 渲染](https://www.mathjax.org/)）或 `"typst"`（使用 [Typst](https://typst.app/) 语法引擎）。默认为 `"katex"`。
- `customMacros`：全局数学公式自定义宏映射表，键为宏命令名，值为展开表达式。例如：`{"\\R": "\\mathbb{R}"}`。
- `katexOptions`：传递给 KaTeX 渲染器的额外高级参数（详见 KaTeX 官方文档）。
- `mathJaxOptions`：传递给 MathJax 渲染器的额外选项。
- `typstOptions`：传递给 Typst 渲染器的额外选项。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.Latex()`
- 源码：[`quartz-community/latex`](https://github.com/quartz-community/latex)
- 安装：`npx quartz plugin add github:quartz-community/latex`
