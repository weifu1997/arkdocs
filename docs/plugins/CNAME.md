---
title: CNAME
description: 为自定义域名部署生成 CNAME 文件。
tags:
  - plugin/emitter
image:
repository: "[quartz-community/cname](https://github.com/quartz-community/cname)"
enabled: true
required: false
---

This plugin emits a `CNAME` record that points your subdomain to the default domain of your site.

If you want to use a custom domain name like `quartz.example.com` for the site, then this is needed.

See [[hosting|Hosting]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

This plugin has no configuration options.

## API

- Category: Emitter
- Function name: `ExternalPlugin.CNAME()`.
- 源码： [`quartz-community/cname`](https://github.com/quartz-community/cname)
- 安装： `npx quartz plugin add github:quartz-community/cname`
