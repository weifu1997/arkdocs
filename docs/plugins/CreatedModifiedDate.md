---
title: CreatedModifiedDate
description: 根据 frontmatter、git 或文件系统确定创建和修改日期。
tags:
  - plugin/transformer
image:
repository: "[quartz-community/created-modified-date](https://github.com/quartz-community/created-modified-date)"
enabled: true
required: false
---

This plugin determines the created, modified, and published dates for a document using three potential data sources: frontmatter metadata, Git history, and the filesystem. See [[authoring content#Syntax]] for more information.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

该插件接受以下配置选项：

- `priority`: The data sources to consult for date information. Highest priority first. Possible values are `"frontmatter"`, `"git"`, and `"filesystem"`. Defaults to `["frontmatter", "git", "filesystem"]`.
- `defaultDateType`: Which date type to use when displaying dates. Can be `"created"`, `"modified"`, or `"published"`. Defaults to `"modified"`.

When loading the frontmatter, the value of [[Frontmatter#List]] is used.

> [!warning]
> If you rely on `git` for dates, make sure `defaultDateType` is set to `modified` in the plugin's options.
>
> Depending on how you [[hosting|host]] your Quartz, the `filesystem` dates of your local files may not match the final dates. In these cases, it may be better to use `git` or `frontmatter` to guarantee correct dates.

## API

- Category: Transformer
- Function name: `ExternalPlugin.CreatedModifiedDate()`.
- 源码： [`quartz-community/created-modified-date`](https://github.com/quartz-community/created-modified-date)
- 安装： `npx quartz plugin add github:quartz-community/created-modified-date`
