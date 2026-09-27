---
title: OxHugoFlavoredMarkdown
description: 兼容 ox-hugo 导出的 Org-mode 文件。
tags:
  - plugin/transformer
image:
repository: "[quartz-community/ox-hugo](https://github.com/quartz-community/ox-hugo)"
enabled: false
required: false
---

This plugin provides support for [ox-hugo](https://github.com/kaushalmodi/ox-hugo) compatibility. See [[OxHugo compatibility]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `wikilinks`: If `true` (default), converts Hugo `{{ relref }}` shortcodes to Quartz [[wikilinks]].
- `removePredefinedAnchor`: If `true` (default), strips predefined anchors from headings.
- `removeHugoShortcode`: If `true` (default), removes Hugo shortcode syntax (`{{}}`) from the content.
- `replaceFigureWithMdImg`: If `true` (default), replaces `<figure/>` with `![]()`.
- `replaceOrgLatex`: If `true` (default), converts Org-mode [[features/Latex|Latex]] fragments to Quartz-compatible LaTeX wrapped in `$` (for inline) and `$$` (for block equations).

> [!warning]
> While you can use this together with [[ObsidianFlavoredMarkdown]], it's not recommended because it might mutate the file in unexpected ways. Use with caution.
>
> If you use `toml` frontmatter, make sure to configure the [[Frontmatter]] plugin accordingly. See [[OxHugo compatibility]] for an example.

## API

- Category: Transformer
- Function name: `ExternalPlugin.OxHugoFlavoredMarkdown()`.
- 源码： [`quartz-community/ox-hugo`](https://github.com/quartz-community/ox-hugo)
- 安装： `npx quartz plugin add github:quartz-community/ox-hugo`
