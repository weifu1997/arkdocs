---
title: StackedPages
description: "Andy Matuschak 风格的横向堆叠滑动窗格（Sliding Panes）。"
tags:
  - plugin/component
image:
new-in-v5: true
repository: "[quartz-community/stacked-pages](https://github.com/quartz-community/stacked-pages)"
enabled: true
required: false
---

Andy Matuschak 风格的堆叠滑动窗格。点击页面内的内部双链时，会在右侧以水平堆叠的形式并排滑出新页面，而不是直接跳走。你可以清晰追踪自己在笔记网络中的漫游路径。每个窗格均展示完整的页面内容，可单独滚动浏览或关闭。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 用法说明

启用后，点击页面内的任何双链都会在右侧作为新窗格滑出。URL 地址会自动更新为包含当前堆叠历史的 `#stacked=slug1,slug2` 哈希值，方便你直接分享或收藏这一组特定的思考路径。

由于横向平移在小屏设备上体验受限，堆叠页面在移动端（屏幕宽度低于 800px）默认自动禁用，移动端点击链接采用常规正常跳转。

### 交互方式

- **点击链接**：在右侧作为新窗格打开目标页面。如果达到窗格上限，最左侧最早的窗格会被移出；
- **关闭窗格**：点击窗格标题栏上的 × 按钮即可将其从堆叠中移除；
- **折叠书脊（Spines）**：当窗格超出视口时，先前的窗格会自动折叠为窄条状的书脊并展示页面标题。点击书脊即可将该窗格重新聚焦并展开；
- **浏览器前进/后退**：完整的堆叠状态保存在 URL 哈希中并与浏览器历史记录完美集成，前进/后退按钮表现完全符合预期。

## 配置选项

该插件接受以下配置选项：

- `maxTabs`：同时可见的最大堆叠窗格数量上限。默认为 `8`。
- `mobileBreakpoint`：移动端断点像素值（低于该宽度时自动禁用堆叠滑动，改为正常跳转）。默认为 `800`。
- `showSpines`：窗格超出视口时是否展示折叠的书脊标题栏。默认为 `true`。
- `animateTransitions`：窗格打开与关闭时是否启用平滑动画过渡。默认为 `true`。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/stacked-pages
  enabled: true
  layout:
    position: afterBody
    priority: 50
    display: all
  options:
    maxTabs: 8
    mobileBreakpoint: 800
    showSpines: true
    animateTransitions: true
```

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.StackedPages()`
- 源码：[`quartz-community/stacked-pages`](https://github.com/quartz-community/stacked-pages)
- 安装：`npx quartz plugin add github:quartz-community/stacked-pages`
