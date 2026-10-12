---
title: "SPA 单页无刷新路由"
tags:
  - feature
---

Quartz 支持单页应用（SPA）风格的页面路由跳转。这能彻底消除页面跳转时因重新加载样式而引起的闪烁（FOUC），极大提升站点的浏览流畅度与交互质感。

其底层机制在于：拦截浏览器的默认超链接跳转行为，改为通过后台异步 `GET` 请求获取目标页面 HTML，随后使用 [micromorph](https://github.com/natemoo-re/micromorph) 进行 DOM 树的高性能局部对比与增量替换。这避免了整页刷新重新解析脚本和样式表，极大降低了网络与渲染开销。

## 配置

- **禁用 SPA 路由**：在 `quartz.config.yaml` 的 [[configuration|全局配置]] 中将 `enableSPA` 设为 `false`。
