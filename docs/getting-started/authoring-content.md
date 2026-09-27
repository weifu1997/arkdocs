---
title: 撰写内容
aliases:
  - "authoring content"
---

Quartz 中的所有内容都应放在 `/content` 文件夹里。站点首页内容位于 `content/index.md`。如果你已经按照 [[installation|安装指南]] 完成设置，这个文件夹应该已经初始化。该文件夹中的任何 Markdown 都会被 Quartz 处理。

建议使用 [Obsidian](https://obsidian.md/) 来编辑和维护 Quartz。它提供了不错的编辑器和图形界面，方便预览、编辑以及链接本地文件和附件。

都准备好了？可以用 `npx quartz build --serve` 在本地预览站点，或查看 [[build|构建参考]] 了解更多选项。

## 语法

Quartz 以 Markdown 文件作为主要写作方式，因此完整支持 Markdown 语法。默认还会附带一些语法扩展，例如 [GitHub Flavored Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)（脚注、删除线、表格、任务列表）和 [Obsidian Flavored Markdown](https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown)（[[callouts|标注]]、[[wikilinks|双链]]）。

此外，Quartz 还允许你在笔记中指定额外的元数据，称为 **frontmatter**。

```md title="content/note.md"
---
title: 示例标题
draft: false
tags:
  - example-tag
---

其余内容写在这里。你可以使用 **Markdown** :)
```

Quartz 原生支持的一些常见 frontmatter 字段：

- `title`：页面标题。如果未提供，Quartz 会使用文件名作为标题。
- `description`：用于链接预览的页面描述。
- `permalink`：页面的自定义 URL。即使文件路径发生变化，该 URL 也会保持不变。
- `aliases`：这篇笔记的其他名称。这是一个字符串列表。
- `tags`：这篇笔记的标签。
- `draft`：是否发布该页面。这是在 Quartz 中创建 [[private pages|私有页面]] 的方式之一。
- `date`：表示笔记发布日期的字符串。通常使用 `YYYY-MM-DD` 格式。

完整的 frontmatter 列表见 [[Frontmatter]]。

## 同步内容

当你对 Quartz 的状态满意后，可以把更改保存到 GitHub。
首先确认已经 [[installation#设置 GitHub 仓库|设置好 GitHub 仓库]]，然后运行 `npx quartz sync`。

## 自定义

`title`、`tags`、`aliases` 和 `cssclasses` 的 frontmatter 解析由 [[Frontmatter]] 插件提供，`date` 由 [[CreatedModifiedDate]] 插件处理，`description` 由 [[Description]] 插件处理。自定义选项见各插件页面。
