---
title: Encrypted Pages Demo
password: quartz
unlisted: true
tags:
  - plugin/transformer
image:
---

恭喜你！你已经成功解密了本页面。🎉

这是 [[EncryptedPages]] 插件的在线实时演示。你当前阅读的正文内容在构建打包时通过 AES-256-GCM 完成了静态加密，并在你的浏览器中通过原生 Web Crypto API 解密呈现。本页面同时标记了 `unlisted: true`，这意味着在你输入正确密码之前，它在全站的搜索、侧边栏和图谱中完全处于隐身状态。

## 底层发生了什么？

1. 在构建打包时，插件读取了本页面 Frontmatter 中的 `password` 字段（密码为 `quartz`），将标题下方的所有正文内容全量加密；
2. 由于页面设置了 `unlisted: true`，插件将其元数据（Slug、标题、链接关系、标签）单独加密存储在 `static/encryptedContentIndex.json` 影子索引中；
3. 当你首次访问时，页面呈现密码输入框，且全站侧边栏图谱、文件树、搜索和标签页均无本页记录；
4. 当你输入正确密码后，插件在浏览器端通过 PBKDF2 派生密钥并完成即时解密；
5. 解密成功后，插件同时解锁了影子索引中的对应条目，并动态更新了内存索引总表。此时派发 `content-index-updated` 事件，全局图谱、目录树和搜索立即更新并展现本页面！

## 密码自动记忆（会话缓存）

你输入的密码已经安全保存在当前浏览器的 Session Storage 会话存储中。如果站点上还有其他使用相同密码加密的页面，插件会自动尝试复用该密码解锁，无需频繁重复输入。

## 尝试为你自己的网站配置加密页面

只需安装该插件并在任意笔记的 Frontmatter 中添加 `password` 字段即可。完整设置说明请参阅 [[EncryptedPages]]。
