---
title: 双链
---

双链最早由早期互联网维基提出，目的是更方便地在页面之间写链接，而不必每次都写 Markdown 或 HTML 链接。

Quartz 默认支持双链，这些链接由 [[CrawlLinks]] 插件解析。双链语法的更多说明见 [Obsidian 关于内部链接的帮助页](https://help.obsidian.md/Linking+notes+and+files/Internal+links)。

该功能作为 [[Obsidian compatibility|Obsidian 兼容]] 的一部分启用，可以在该插件中配置、启用或禁用。

为了与 Obsidian 保持一致，双链匹配不区分大小写：`[[My Note]]`、`[[my note]]` 和 `[[MY NOTE]]` 都会解析到同一个文件。生成的 URL 会转为小写（例如 `my-note`）。

## 语法

- `[[Path to file]]`: produces a link to `Path to file.md` (or `Path-to-file.md`) with the text `Path to file`
- `[[Path to file | Here's the title override]]`: produces a link to `Path to file.md` with the text `Here's the title override`
- `[[Path to file#Anchor]]`: produces a link to the anchor `Anchor` in the file `Path to file.md`
- `[[Path to file#^block-ref]]`: produces a link to the specific block `block-ref` in the file `Path to file.md`

### Embeds

- `![[Path to image]]`: embeds an image into the page
- `![[Path to image|100x145]]`: embeds an image into the page with dimensions 100px by 145px
- `![[Path to file]]`: transclude an entire page
- `![[Path to file#Anchor]]`: transclude everything under the header `Anchor`
- `![[Path to file#^b15695]]`: transclude block with ID `^b15695`
