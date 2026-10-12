---
title: CNAME
description: "为自定义独立域名部署生成 CNAME 记录文件。"
tags:
  - plugin/emitter
image:
repository: "[quartz-community/cname](https://github.com/quartz-community/cname)"
enabled: true
required: false
---

该插件负责在输出目录根节点生成 `CNAME` 文件，将自定义子域名指向站点的默认托管域名（例如 GitHub Pages）。

如果你希望为站点绑定形如 `quartz.example.com` 的独立自定义域名，则需要此插件。

详情请参阅 [[hosting|生产环境托管部署]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件无额外配置选项。

## API

- 类别：发射器（Emitter）
- 函数名：`ExternalPlugin.CNAME()`
- 源码：[`quartz-community/cname`](https://github.com/quartz-community/cname)
- 安装：`npx quartz plugin add github:quartz-community/cname`
