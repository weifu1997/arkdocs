---
title: CanvasPage
description: "将 JSON Canvas 画布文件渲染为可交互平移的全景白板页面。"
tags:
  - plugin/pageType
image: "#7852ee"
new-in-v5: true
repository: "[quartz-community/canvas-page](https://github.com/quartz-community/canvas-page)"
enabled: true
required: false
---

该插件属于页面类型插件，负责将 [JSON Canvas](https://jsoncanvas.org)（`.canvas`）文件渲染为支持拖拽平移与滚轮缩放的交互式全景白板页面。它使用专属的 `"canvas"` [[layout#页面框架（Page Frames）|页面框架]]，提供全屏无限画布体验，并带有可抽屉式折叠的左侧导航栏。它完整遵循 [JSON Canvas 1.0 规范](https://jsoncanvas.org/spec/1.0/)，包括支持 Markdown 排版的文本卡片、关联知识库其他笔记的文件卡片、外链卡片以及分组容器。节点之间的连线通过 SVG 矢量路径绘制，支持箭头、文本标签与多种主题配色。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `enableInteraction`：是否在画布上开启拖拽平移与滚轮缩放交互。默认值：`true{:ts}`。
- `initialZoom`：初次载入画布时的缩放级别。默认值：`1{:ts}`。
- `minZoom`：缩小操作允许的最小缩放比例。默认值：`0.1{:ts}`。
- `maxZoom`：放大操作允许的最大缩放比例。默认值：`5{:ts}`。

### Canvas 专属页面框架

`canvas-page` 插件通过 Frame Registry 提供了自己的 `"canvas"` 页面框架：

- 默认以**全屏模式**渲染（100vw × 100vh），最大化画布视野空间，契合 JSON Canvas 的“无界白板”理念；
- 提供**可折叠左侧边栏**，从左侧平滑滑入，包含与内容页相同的左侧组件（如文件浏览、搜索、页面标题等）；
- 边栏切换图标（汉堡菜单/关闭按钮）位于左上角；
- 画布缩放控制按钮（放大、缩小、重置）位于右侧浮层；
- 在移动端设备上，侧边栏采用浮层覆盖模式，不会挤压画布视口。

如需使用标准三栏布局代替全屏画布，可在 `quartz.config.yaml` 中覆盖：

```yaml title="quartz.config.yaml"
layout:
  byPageType:
    canvas:
      template: default # 改用标准三栏布局
```

### 功能特性

- **文本卡片**：支持完整 GFM Markdown 语法（标题、加粗、斜体、列表、代码块）；
- **文件卡片**：链接至知识库内的其他页面，鼠标悬停时支持卡片预览浮层；
- **外链卡片**：展示外部网页链接与预览；
- **分组容器**：支持带标题和背景底色的分组线框；
- **连线与关系箭头**：支持四个方向连接、标签文字与颜色标记；
- **六种预设配色**：红、橙、黄、绿、青、紫，并支持自定义十六进制颜色值。

## API

- 类别：页面类型（Page Type）
- 函数名：`ExternalPlugin.CanvasPage()`
- 源码：[`quartz-community/canvas-page`](https://github.com/quartz-community/canvas-page)
- 安装：`npx quartz plugin add github:quartz-community/canvas-page`
