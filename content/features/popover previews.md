---
title: 链接悬浮卡片预览
aliases:
  - "popover previews"
---

类似于维基百科（Wikipedia），当你在 Quartz 中将鼠标悬停在内部链接上时，会自动弹出一个浮层卡片预览页面内容，并且你可以直接在弹窗内滚动浏览。如果链接指向了特定的小标题锚点，预览弹窗还会自动滚动将对应的小标题呈现于视野中央。

默认情况下，出于浏览器 [CORS 跨域安全策略](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)限制，Quartz 仅抓取知识库内部页面的悬浮预览。其底层通过获取所有带有 `popover-hint` 类名的 HTML 元素来实现。对于大多数页面，这包括页面大标题、字数与预计阅读时间等元数据、Tags 标签以及正文内容。

在[[creating components|创建自定义组件]]时，你可以将 `popover-hint` 类名添加到你希望被浮层预览捕捉的元素上。

与 Obsidian 类似，[[quartz-layout-desktop.png|使用双链引用的图片]] 同样支持悬停弹窗预览。

## 配置与定制

- **禁用悬浮预览**：在 `quartz.config.yaml` 的通用配置中将 `enablePopovers` 设为 `false`。
- **样式文件**：`quartz/components/styles/popover.scss`
- **内联交互脚本**：`quartz/components/scripts/popover.inline.ts`
