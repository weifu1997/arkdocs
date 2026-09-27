---
title: 阅读模式
tags:
  - component
---

阅读模式会隐藏侧边栏和其他界面元素，帮助用户把注意力集中在内容上。启用后，可以获得更干净、更少干扰的阅读体验。

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 配置

阅读模式默认启用。要禁用它，请在 `quartz.config.yaml` 中设置 `enabled: false`：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/reader-mode
    enabled: false
```

或者完全移除该插件：

```bash
npx quartz plugin remove github:quartz-community/reader-mode
```

- 安装： `npx quartz plugin add github:quartz-community/reader-mode`
- 源码： [`quartz-community/reader-mode`](https://github.com/quartz-community/reader-mode)

## 用法

阅读模式切换按钮带有书籍图标。点击后：

- 侧边栏会被隐藏
- 将鼠标悬停在内容区域上时，会暂时显示侧边栏

与深色模式不同，阅读模式的状态不会在页面重新加载后保留，但会在站点内的 SPA 导航期间保持。

## 自定义

你可以通过 CSS 变量和样式自定义阅读模式的外观。该组件使用以下类：

- `.readermode`: The toggle button
- `.readerIcon`: The book icon
- `[reader-mode="on"]`: Applied to the root element when Reader Mode is active

Example customization in your custom CSS:

```scss
.readermode {
  // Customize the button
  svg {
    stroke: var(--custom-color);
  }
}
```
