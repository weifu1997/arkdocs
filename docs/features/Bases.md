---
title: "Bases 支持"
tags:
  - component
---

Quartz supports rendering [Obsidian Bases](https://obsidian.md/changelog/2025-04-15-desktop-v1.8.0/) (`.base` files) as interactive database-like views. Bases files define queries over your vault's notes and display the results in configurable views such as tables, lists, cards, galleries, and boards.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

Bases support is provided by the [[BasesPage]] plugin. See the plugin page for configuration options, built-in views, the expression engine, and how to extend with custom views.

## Demo

![[Base.base]]

## 自定义

- 安装： `npx quartz plugin add github:quartz-community/bases-page`
- 源码： [`quartz-community/bases-page`](https://github.com/quartz-community/bases-page)
