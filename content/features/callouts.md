---
title: 标注块（Callouts）
tags:
  - feature/transformer
---

Quartz 完整支持与 Obsidian 相同的标注块（Admonition / Callout）语法。

包括：

- 12 种内置不同的标注类型（每种均有多种常见别名支持）
- 可折叠展开的标注块
- 支持多层嵌套标注

```markdown
> [!info] 标题
> 这是一个标注块内容！
```

完整语法与说明请参阅 [Obsidian 官方 Callouts 文档](https://help.obsidian.md/Editing+and+formatting/Callouts)。

> [!warning] 注意
> 如果已经配置标注却没有正常渲染？请检查插件执行顺序，确保 [[ObsidianFlavoredMarkdown]] 位于 [[SyntaxHighlighting]] *之后*。

## 自定义

标注功能由 [[ObsidianFlavoredMarkdown]] 插件提供。如何启用或禁用请参阅该插件文档。

你可以通过编辑 `quartz/styles/callouts.scss` 或自定义样式表来修改标注图标和配色。

### 添加自定义标注类型

默认情况下，未识别的自定义标注类型会自动回退套用 `note` 基础样式。如果想要定制专属的视觉效果，可将以下代码加入 `custom.scss`：

```scss title="quartz/styles/custom.scss"
.callout {
  &[data-callout="custom"] {
    --color: #customcolor;
    --border: #custombordercolor;
    --bg: #custombg;
    --callout-icon: url("data:image/svg+xml; utf8, <经过URL编码的SVG代码>"); // SVG 图标
  }
}
```

> [!warning] 提示
> 将 SVG 图标置入 CSS 前，请确保已进行 URL 编码（URL Encoded）。你可以使用 [在线 URL 编码工具](https://yoksel.github.io/url-encoder/) 快速完成转换。

## 效果展示与内置类型

> [!info] 信息提示
> 默认标题展示

> [!question]+ 标注块可以*嵌套*与折叠吗？
>
> > [!todo]- 当然可以！并且可以设置默认折叠！
> >
> > > [!example] 你甚至可以嵌套多层深度。

> [!note] 笔记（Note）
> 别名："note"

> [!abstract] 摘要（Abstract）
> 别名："abstract", "summary", "tldr"

> [!info] 信息（Info）
> 别名："info"

> [!todo] 待办（Todo）
> 别名："todo"

> [!tip] 提示（Tip）
> 别名："tip", "hint", "important"

> [!success] 成功（Success）
> 别名："success", "check", "done"

> [!question] 疑问与帮助（Question）
> 别名："question", "help", "faq"

> [!warning] 警告（Warning）
> 别名："warning", "attention", "caution"

> [!failure] 失败（Failure）
> 别名："failure", "missing", "fail"

> [!danger] 危险（Danger）
> 别名："danger", "error"

> [!bug] 缺陷（Bug）
> 别名："bug"

> [!example] 示例（Example）
> 别名："example"

> [!quote] 引用（Quote）
> 别名："quote", "cite"
