---
title: "OxHugo 兼容"
tags:
  - feature/transformer
---

[org-roam](https://www.orgroam.com/) 是基于 [Emacs](https://en.wikipedia.org/wiki/Emacs) 的纯文本个人知识管理系统。[ox-hugo](https://github.com/kaushalmodi/ox-hugo) 则是一个将 `org-mode` 笔记导出为 [Hugo](https://gohugo.io/) 兼容 Markdown 格式的后端工具。

因为由 `ox-hugo` 生成的 Markdown 并非纯标准 Markdown，而是夹带了 Hugo 特有的宏与短代码，我们需要对其进行兼容性转换以适配 Quartz。这由 [[OxHugoFlavoredMarkdown]] 插件完成。虽然该插件最初是为 `ox-hugo` 编写的，但它同样适用于任何面向 Hugo 的特定 Markdown。

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/obsidian-flavored-markdown
    enabled: true
    order: 30
  - source: github:quartz-community/ox-hugo
    enabled: true
    order: 25 # 必须在 obsidian-flavored-markdown 之前执行
  - source: github:quartz-community/github-flavored-markdown
    enabled: true
    order: 40
  - source: github:quartz-community/note-properties
    enabled: true
    options:
      delimiters: "+++"
      language: toml # 若使用 TOML 格式的 Frontmatter
    order: 5
```

如果采用 TS 代码覆盖方式：

```ts title="quartz.ts (覆盖配置)"
import * as ExternalPlugin from "./.quartz/plugins"

ExternalPlugin.NoteProperties({ delims: "+++", language: "toml" })
ExternalPlugin.OxHugoFlavouredMarkdown()
```

> [!note] 提示
> 在 YAML 中，插件执行次序由 `order` 字段决定，数值越小越优先执行。请确保 `ox-hugo` 的 `order` 小于 `obsidian-flavored-markdown`。

## 用法说明

由于 `org-roam` 原生并非 Markdown 格式，Quartz 无法直接解析 `.org` 文件。你需要借助 `ox-hugo` 等外部工具预先将 `org-roam` 笔记导出为 Markdown 放入 `content` 文件夹中。

## 驱动插件

该特性由 [[OxHugoFlavoredMarkdown]] 插件提供。详见该插件专属文档。
