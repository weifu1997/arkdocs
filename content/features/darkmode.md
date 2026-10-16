---
title: 深色模式
tags:
  - component
---

Quartz 开箱即用支持深色模式，并会遵循用户的主题偏好。之后手动切换深色模式开关时，状态会保存在浏览器的本地存储中，以便在后续页面加载时保持。

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 自定义

- 移除深色模式：从 `quartz.config.yaml` 中删除 `darkmode` 条目，或设置 `enabled: false`。
- 安装： `npx quartz plugin add github:quartz-community/darkmode`
- 源码： [`quartz-community/darkmode`](https://github.com/quartz-community/darkmode)

你也可以监听 `themechange` 事件，在主题变化时执行自定义逻辑。

```js
document.addEventListener("themechange", (e) => {
  console.log("Theme changed to " + e.detail.theme) // either "light" or "dark"
  // your logic here
})
```
