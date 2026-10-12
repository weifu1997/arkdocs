---
title: 文件夹与标签列表
tags:
  - feature/emitter
---

Quartz 会自动为你的所有文件夹和标签生成结构清晰的聚合索引归档页。

## 文件夹归档列表（Folder Listings）

Quartz 会自动为文件夹生成目录页，汇总列出该文件夹下的所有笔记。这包括位于任意多层子目录深度的所有文章。

此外，Quartz 还会为各个中间子文件夹生成聚合页。例如，若有一篇笔记路径为 `content/abc/def/note.md`，Quartz 会分别为 `abc` 路径下的所有笔记以及 `abc/def` 路径下的笔记各自生成一个聚合归档页。

在正文中，你可以通过以斜杠结尾的路径直接双链指向某个文件夹列表，例如：`[[advanced/]]`（呈现为 [[advanced/]]）。

默认情况下，Quartz 会将该页面命名为 `Folder: <文件夹名>` 且不带描述。你可以通过在该文件夹下创建一个 `index.md` 文件并在其 Frontmatter 中声明 `title` 字段来自由覆盖展示名称。你在该文件中撰写的任何正文段落，也会直接展示在文件夹归档页的顶部作为目录介绍。

例如，对于 `content/posts` 文件夹，你可以创建 `content/posts/index.md` 为该文章专栏撰写专属的前言导语。

## 标签归档列表（Tag Listings）

Quartz 会为知识库中的每个独立 Tag 标签自动创建聚合索引页，列出所有被打上该标签的文章卡片。

Quartz 同样支持多层嵌套标签层级（例如 `#plugin/emitter`），并会为该标签层级的每个层级分别渲染独立的归档页。它还会在网站的 `/tags` 路由自动生成全站全局标签总览页，一览所有可用标签。

你可以通过 `tags/标签名` 前缀链接到标签列表，例如：`[[tags/plugin]]`（呈现为 [[tags/plugin]]）。

类似于文件夹，你也可以为标签归档页定制标题和介绍。例如，若想为 `#component` 标签编写介绍，只需创建 `content/tags/component.md` 并写入标题与内容即可。

## 自定义

Quartz 允许你为这两种聚合页自定义内容的排序规则。文件夹归档由 [[FolderPage]] 插件提供，标签归档由 [[TagPage]] 插件提供。详见对应插件专属文档。
