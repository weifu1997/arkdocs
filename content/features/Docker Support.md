---
title: "Docker 容器化支持"
tags:
  - feature
---

Quartz 附带了开箱即用的 Dockerfile，允许你在无需于本机安装 Node.js 环境的情况下，通过容器在本地运行和预览 Quartz 站点。

执行以下单行命令即可在 Docker 容器中构建并启动 Quartz：

```sh
docker run --rm -it -p 8080:8080 -p 3001:3001 -v ./content:/usr/src/app/content $(docker build -q .)
```

> [!warning] 切勿用于生产环境服务
> `serve` 本地预览服务仅供本地实时调试与预览。生产环境部署请参阅 [[hosting|生产环境托管部署]]。
