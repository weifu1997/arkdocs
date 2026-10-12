---
title: EncryptedPages
description: "带影子内容索引的端到端密码保护加密页面系统。"
tags:
  - plugin/transformer
  - plugin/emitter
image: "#FF1493"
new-in-v5: true
repository: "[quartz-community/encrypted-pages](https://github.com/quartz-community/encrypted-pages)"
enabled: true
required: false
---

密码保护加密页面系统。在构建时使用强加密算法 AES-256-GCM 对页面正文进行预加密，并在浏览器端通过原生的 Web Crypto API 动态解密。密码直接在每篇笔记的 Frontmatter 中单独指定。配套的发射器还会输出一份加密的“影子内容索引”，使未列出的私密加密文章在访客输入正确密码解锁后，能动态实时在图谱、侧边栏目录树和搜索中显现——而对未持有密码的访客则绝不泄露任何元数据蛛丝马迹。

> [!example] 实时交互演示
> 欢迎亲身体验：[[EncryptedPages Demo|加密页面演示页面]]。密码为 `quartz`。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 用法说明

只需在任意笔记的 Frontmatter 中添加 `password` 字段即可对其进行加密保护：

```yaml
---
title: 我的绝密笔记
password: mysecretpassword
---
```

页面正文会在构建阶段全量加密。访客必须输入正确密码方可解密并阅读正文。

验证成功的密码会自动缓存在浏览器的 Session Storage 会话存储中，并在访问同站其他加密页面时自动尝试解锁，无需重复输入。

### 从全网检索与发现界面中完全隐藏加密文章

默认情况下，加密文章依然会出现在关系图谱、目录树、搜索框、RSS 订阅源和反向链接中——访客能看到文章存在且能看到标题，但在输入密码前无法阅读正文内容。

如果你希望在访客成功解密之前将加密文章彻底彻底隐藏（隐身模式），只需在其 Frontmatter 中声明 `unlisted: true`：

```yaml
---
title: 我的绝密笔记
password: mysecretpassword
unlisted: true
---
```

被标记为 `unlisted` 的页面具有以下特性：

- **从所有公开索引中彻底移除**：不会出现在 `contentIndex.json`、`sitemap.xml`、RSS 订阅源、反向链接、最近笔记、目录列表、标签列表、Bases 视图、图谱和搜索结果中；
- 依然会作为独立的加密 HTML 文件输出，因此**可以通过直链 URL 直接访问**；
- 其核心元数据（Slug、标题、链接关系、标签）会被单独加密写入 `static/encryptedContentIndex.json` 影子索引文件中；
- 当访客成功输入密码解密后，该页面的元数据会被动态补丁注入到浏览器内存索引中，从而使图谱、目录树和搜索在当前会话的剩余时间内实时展现该页面。服务端生成的硬编码列表（如反向链接、Bases 视图等）在当前会话中保持静态隐藏，直到站点重新构建。

如果想将该隐身行为作为全站所有加密页面的默认设置，可在插件选项中配置 `unlistWhenEncrypted: true`。

### 永久隐身页面（`stealth`）

如果你希望某篇页面**永久彻底不可见**——即哪怕用户已经成功解密了该页面，也绝不在侧边栏、图谱或搜索中将其列出，仅允许通过直接 URL 访问——可以在 Frontmatter 中设置 `stealth: true`：

```yaml
---
title: 极度绝密暗道
password: mysecretpassword
stealth: true
---
```

隐身页面（Stealth page）：
- 从所有公开发现界面中完全抹除；
- **不会**在影子索引（`encryptedContentIndex.json`）中记录任何条目；
- 即使访客输入正确密码，图谱和搜索也永远不会感知到该页面的存在，仅在当前页面上解密渲染正文；
- 密码仍会被缓存到会话存储中，再次访问同一隐身页面时无需重输。

适合用于“秘密暗门”类文章：例如仅向特定个人发放的私密笔记。

## 配置选项

该插件同时提供了一个转换器、一个发射器和一个前端组件：

- `iterations`：用于密钥派生的 PBKDF2 迭代轮数。数值越高越安全，但解密耗时越长。默认为 `600000`。
- `passwordField`：在 Frontmatter 中用于存储页面密码的字段名。默认为 `"password"`。
- `unlistWhenEncrypted`：若为 `true`，全站所有加密页面默认均自动打上 `unlisted` 隐藏标记。默认为 `false`。
- `outputPath`：影子内容索引文件的输出相对路径。默认为 `"static/encryptedContentIndex.json"`。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/encrypted-pages
  enabled: true
  options:
    iterations: 600000
    passwordField: password
    unlistWhenEncrypted: false
    outputPath: static/encryptedContentIndex.json
```

> [!warning] 插件执行顺序关键提醒
> `EncryptedPages` 转换器会将加密页面的整个 HTML 语法树直接替换为密文容器。任何需要读取真实 HTML 的转换器（尤其是为反向链接和影子索引提供支撑的 [[CrawlLinks]]），**必须排在 `EncryptedPages` 之前执行**。请使用 `quartz.config.yaml` 中的 `order` 字段严格保证此顺序。

## 安全性声明

- 内容采用工业级标准 **AES-256-GCM** 算法加密，配合 **PBKDF2 SHA-256** 密钥派生；
- 无论可见性如何设置，明文绝不会泄露在搜索索引、RSS 订阅源或影子索引中；
- 影子索引是一组扁平的不透明加密密文块。即便攻击者下载了该文件，也只能获知密文数量和 PBKDF2 轮数，无法获取 Slug、标题或任何关联信息；
- 密码在笔记的 Frontmatter 中指定，请避免将包含敏感密码的文件提交推送到公开的 Git 仓库。

## API

- 类别：转换器（Transformer）、发射器（Emitter）
- 函数名：`ExternalPlugin.EncryptedPages()`、`ExternalPlugin.EncryptedContentIndex()`
- 源码：[`quartz-community/encrypted-pages`](https://github.com/quartz-community/encrypted-pages)
- 安装：`npx quartz plugin add github:quartz-community/encrypted-pages`
