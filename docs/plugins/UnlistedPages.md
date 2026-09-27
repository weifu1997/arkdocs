---
title: UnlistedPages
description: 从导航和索引中隐藏页面，但仍会发布它们。
tags:
  - plugin/transformer
image:
new-in-v5: true
repository: "[quartz-community/unlisted-pages](https://github.com/quartz-community/unlisted-pages)"
enabled: true
required: false
---

Zero-config transformer that makes `unlisted: true` in a page's frontmatter a first-class way to opt out of every listing surface on your site. The page is still emitted as HTML and remains accessible by direct URL, but is absent from `contentIndex.json`, RSS, sitemap, graph, explorer, search, backlinks, recent notes, folder listings, and tag listings.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

## 用法

Add an `unlisted` field to any page's frontmatter:

```yaml
---
title: My Draft
unlisted: true
---
```

That's it. Every Quartz v5 plugin that respects the `file.data.unlisted` convention will then hide the page.

## What each plugin does

| Plugin         | Behavior when `unlisted: true`                                             |
| -------------- | -------------------------------------------------------------------------- |
| `ContentIndex` | Page absent from `contentIndex.json`, `sitemap.xml`, and the RSS feed.     |
| `Search`       | Page absent from search results (derived from `contentIndex.json`).        |
| `Graph`        | Page absent from graph nodes and edges (derived from `contentIndex.json`). |
| `Explorer`     | Page absent from the sidebar file tree (derived from `contentIndex.json`). |
| `Backlinks`    | Page never appears as a backlink source on other pages.                    |
| `RecentNotes`  | Page absent from the recent notes list.                                    |
| `FolderPage`   | Page absent from folder listings and folder discovery.                     |
| `TagPage`      | Page absent from tag discovery and tag listings.                           |

In every case, the page's HTML is still emitted and accessible by direct URL.

## 配置

Zero options. Just enable it.

```yaml title="quartz.config.yaml"
- source: github:quartz-community/unlisted-pages
  enabled: true
```

## Interaction with [[EncryptedPages]]

The [[EncryptedPages]] plugin also sets `file.data.unlisted` when its `unlistWhenEncrypted: true` option is set or when a page has `unlisted: true` in frontmatter. The two plugins compose cleanly:

- If you install only `UnlistedPages`: any page with `unlisted: true` in frontmatter is hidden from listing surfaces. Encryption is independent.
- If you install only `EncryptedPages`: `unlisted: true` only takes effect on pages that are also encrypted (have a password). Non-encrypted pages with `unlisted: true` are silently ignored.
- If you install both: `unlisted: true` works for every page, encrypted or not. This is the recommended setup for sites that use encrypted pages.

## API

- Category: Transformer
- Function name: `ExternalPlugin.UnlistedPages()`.
- 源码： [`quartz-community/unlisted-pages`](https://github.com/quartz-community/unlisted-pages)
- 安装： `npx quartz plugin add github:quartz-community/unlisted-pages`
