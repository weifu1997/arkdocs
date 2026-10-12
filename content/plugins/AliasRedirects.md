---
title: AliasRedirects
description: "根据 Frontmatter 别名和大小写敏感 URL 自动生成重定向页面。"
tags:
  - plugin/emitter
image: https://images.unsplash.com/photo-1601735479770-bb5de9dbe844
repository: "[quartz-community/alias-redirects](https://github.com/quartz-community/alias-redirects)"
enabled: true
required: false
---

该插件负责生成 HTML 重定向页面，以确保旧 URL 能够平滑跳转到规范页面。它处理两种类型的重定向：

1. **Frontmatter 别名（Aliases）**：为你内容元数据中定义的别名生成重定向页面；
2. **保留大小写的向后兼容重定向**：由于 Quartz v5 默认将所有 Slug 路径规范化为纯小写，该插件为原先包含大写字母的 URL 自动生成重定向页面，防止外部死链。

### 1. Frontmatter 别名重定向

如果 `foo.md` 包含以下元数据：

```md title="foo.md"
---
title: "Foo"
aliases:
  - "bar"
---
```

访问 `host.me/bar` 将被永久重定向到 `host.me/foo`。

发射器支持以下 Frontmatter 别名字段：
- `aliases`
- `alias`

### 2. 保留大小写的向后兼容重定向

Quartz v5 默认将所有 URL 转换为小写。如果你是从保留原始大小写的 v4 版本迁移而来，以前被搜索引擎或书签收录的包含大写字母的 URL（例如 `/Diary/My-Note`）将会返回 404 错误。

当启用 `enableCaseRedirects`（默认启用）时，该插件会自动检测原始文件路径与小写 Slug 不同的文件，并在原始大小写 URL 处生成重定向页面。例如，如果你的内容目录中包含 `Diary/2026-01-01.md`，该插件会生成：

- 规范主页面：`/diary/2026-01-01`（由正常构建生成）；
- 重定向页面：`/Diary/2026-01-01`（由本插件生成）。

重定向页面包含了符合最佳 SEO 规范的元标签：
- `<meta http-equiv="refresh" content="0; url=...">`：实现浏览器秒级即时跳转；
- `<link rel="canonical">`：规范链接指向小写标准 URL；
- `<meta name="robots" content="noindex">`：防止搜索引擎重复收录镜像页面。

> [!note] 文件系统说明
> 保留大小写的重定向对不区分大小写的文件系统（macOS、Windows）没有额外副作用，因为 Web 服务器本身已将两种大小写解析为同一文件。该插件会自动检测文件系统类型，并在无需生成时跳过。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `enableCaseRedirects`：若为 `true`（默认值），为因 v5 小写规范化而发生大小写变更的 URL 自动生成重定向页面。设为 `false` 可禁用此行为。

## API

- 类别：发射器（Emitter）
- 函数名：`ExternalPlugin.AliasRedirects()`
- 源码：[`quartz-community/alias-redirects`](https://github.com/quartz-community/alias-redirects)
- 安装：`npx quartz plugin add github:quartz-community/alias-redirects`
