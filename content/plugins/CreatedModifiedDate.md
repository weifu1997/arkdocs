---
title: CreatedModifiedDate
description: "根据 Frontmatter、Git 历史或文件系统综合判定文档的创建与最后修改日期。"
tags:
  - plugin/transformer
image:
repository: "[quartz-community/created-modified-date](https://github.com/quartz-community/created-modified-date)"
enabled: true
required: false
---

该插件从三种潜在数据源推断并确定文档的创建日期（Created）、修改日期（Modified）与发布日期（Published）：Frontmatter 元数据、Git 提交历史以及物理文件系统。详见 [[authoring content#语法|撰写内容语法]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

该插件接受以下配置选项：

- `priority`：获取日期信息时咨询的数据源优先级列表，越靠前优先级越高。可选值为 `"frontmatter"`、`"git"` 和 `"filesystem"`。默认为 `["frontmatter", "git", "filesystem"]`。
- `defaultDateType`：在前端展示时默认采用哪种类型的日期。可选 `"created"`、`"modified"` 或 `"published"`。默认为 `"modified"`。

> [!warning] Git 时间戳注意事项
> 如果你依赖 Git 历史来提取日期，请确保在插件选项中将 `defaultDateType` 设为 `modified`。
>
> 此外，根据你[[hosting|托管部署]] Quartz 的方式不同，云端服务器上的物理文件时间戳可能与本地不一致。在这种情况下，优先采用 `git` 或 `frontmatter` 是保证日期准确的最佳实践。

## API

- 类别：转换器（Transformer）
- 函数名：`ExternalPlugin.CreatedModifiedDate()`
- 源码：[`quartz-community/created-modified-date`](https://github.com/quartz-community/created-modified-date)
- 安装：`npx quartz plugin add github:quartz-community/created-modified-date`
