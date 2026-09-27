---
title: 标注
tags:
  - feature/transformer
---

Quartz 支持与 Obsidian 相同的标注（Admonition/callout）语法。

这包括：

- 12 种不同的标注类型（每种都有若干别名）
- 可折叠标注

```
> [!info] Title
> This is a callout!
```

支持的类型和语法见[这里的文档](https://help.obsidian.md/Editing+and+formatting/Callouts)。

> [!warning]
> 已经启用标注却没有显示？你可能需要调整插件顺序，让 [[ObsidianFlavoredMarkdown]] 位于 [[SyntaxHighlighting]] _之后_。

## 自定义

标注功能由 [[ObsidianFlavoredMarkdown]] 插件提供。如何启用或禁用见该插件页面。

你可以通过自定义 `quartz/styles/callouts.scss` 来编辑图标。

### 添加自定义标注

默认情况下，自定义标注会套用 `note` 样式。要做出更精致的效果，需要把以下内容加入 `custom.scss`。

```scss title="quartz/styles/custom.scss"
.callout {
  &[data-callout="custom"] {
    --color: #customcolor;
    --border: #custombordercolor;
    --bg: #custombg;
    --callout-icon: url("data:image/svg+xml; utf8, <custom formatted svg>"); //SVG icon code
  }
}
```

> [!warning]
> Don't forget to ensure that the SVG is URL encoded before putting it in the CSS. You can use tools like [this one](https://yoksel.github.io/url-encoder/) to help you do that.

## Showcase

> [!info]
> Default title

> [!question]+ Can callouts be _nested_?
>
> > [!todo]- Yes!, they can. And collapsed!
> >
> > > [!example] You can even use multiple layers of nesting.

> [!note]
> Aliases: "note"

> [!abstract]
> Aliases: "abstract", "summary", "tldr"

> [!info]
> Aliases: "info"

> [!todo]
> Aliases: "todo"

> [!tip]
> Aliases: "tip", "hint", "important"

> [!success]
> Aliases: "success", "check", "done"

> [!question]
> Aliases: "question", "help", "faq"

> [!warning]
> Aliases: "warning", "attention", "caution"

> [!failure]
> Aliases: "failure", "missing", "fail"

> [!danger]
> Aliases: "danger", "error"

> [!bug]
> Aliases: "bug"

> [!example]
> Aliases: "example"

> [!quote]
> Aliases: "quote", "cite"
