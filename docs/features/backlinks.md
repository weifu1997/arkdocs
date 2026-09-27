---
title: 反向链接
tags:
  - component
---

笔记的反向链接，是指从其他笔记指向该笔记的链接。如果启用了 [[popover previews|预览弹出层]]，反向链接面板中的链接也会显示丰富预览。

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 自定义

- 移除反向链接：从 `quartz.config.yaml` 中删除 `backlinks` 条目，或设置 `enabled: false`。
- 为空时隐藏：如果当前页面没有任何反向链接，则隐藏「反向链接」（默认为 `true`）。要禁用此行为，请在 `quartz.config.yaml` 的插件选项中设置 `hideWhenEmpty: false`。
- 安装： `npx quartz plugin add github:quartz-community/backlinks`
- 源码： [`quartz-community/backlinks`](https://github.com/quartz-community/backlinks)
