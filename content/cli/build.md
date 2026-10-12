---
title: quartz build
aliases:
  - build
---

`build` 命令会把 Markdown 内容转换成静态 HTML 网站。它会通过已配置的插件处理文件，并把最终站点输出到你指定的目录。

## 参数

| 参数              | 简写 | 说明                                               | 默认值            |
| ----------------- | ---- | -------------------------------------------------- | ----------------- |
| `--directory`     | `-d` | 包含 Quartz 项目的目录                             | 当前目录          |
| `--verbose`       | `-v` | 启用详细日志，便于调试                             | `false`           |
| `--output`        | `-o` | 构建后站点的保存目录                               | `public`          |
| `--serve`         |      | 启动本地开发服务器                                 | `false`           |
| `--watch`         |      | 文件变化时重新构建站点                             | `false`           |
| `--port`          |      | 开发服务器端口                                     | `8080`            |
| `--wsPort`        |      | 用于热更新的 WebSocket 端口                        | `3001`            |
| `--baseDir`       |      | 设置站点的基础路径（例如用于 GitHub Pages）        | `/`               |
| `--remoteDevHost` |      | 开发服务器使用的主机名                             | `localhost`       |
| `--bundleInfo`    |      | 输出包含打包体积信息的 JSON 文件                   | `false`           |
| `--concurrency`   | `-c` | 构建时使用的工作线程数                             | CPU 核心数        |

## 示例

### 基础构建

把站点生成到 `public` 文件夹。

```shell
npx quartz build
```

### 开发模式

启动本地服务器并监听文件变化。这是写作时预览站点最常用的方式。

```shell
npx quartz build --serve
```

### 自定义输出目录和端口

构建到指定文件夹，并在其他端口运行服务器。

```shell
npx quartz build --serve --output dist --port 3000
```

### 性能调优

如果仓库非常大，可以限制并发工作线程数以节省内存。

```shell
npx quartz build --concurrency 2
```

## Serve 与 Watch

`--serve` 和 `--watch` 控制不同行为：

- **`--serve`** 会启动本地开发服务器，并自动监听变化（隐含 `--watch`）。这是本地开发的推荐模式。
- **`--watch`** 只监听文件变化并自动重新构建，不会启动服务器。适合 CI 流水线或自定义服务器，需要自动重建但不由 Quartz 提供服务的场景。

大多数情况下应使用 `--serve`：

```shell
npx quartz build --serve
```

## 开发服务器

`--serve` 会启动本地 Web 服务器。该服务器仅用于开发和预览，不适合生产环境。部署说明见 [[hosting|部署]]。

### 热更新

使用 `--serve` 时，Quartz 会自动启用 `--watch`。它通过 WebSocket 连接（端口由 `--wsPort` 指定）通知浏览器文件已变化。浏览器随后会自动刷新，显示最新内容。
