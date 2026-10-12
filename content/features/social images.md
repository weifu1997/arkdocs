---
title: "社交媒体预览卡片（Open Graph）"
tags:
  - feature
---

当你在微信、Twitter/X、Slack 或 Discord 等社交平台分享链接时，许多平台会根据 Open Graph 元数据展示精美的富文本预览卡片（包括封面图、标题和描述摘要）。

Quartz 支持为全站的每一篇笔记页面**动态自动合成并生成专属的社交封面预览图（OG Image）**。

## 效果展示

启用 [[CustomOgImages]] 发射器插件后，[[authoring content|撰写内容]] 这篇文章在社交网络分享时的预览卡片呈现效果如下：

| 浅色主题模式 | 深色主题模式 |
| ----------------------------------- | ---------------------------------- |
| ![[social-image-preview-light.png]] | ![[social-image-preview-dark.png]] |

## 驱动插件

该特性由 [[CustomOgImages]] 插件提供。有关自定义字体、布局和背景样式，请参阅该插件文档。
