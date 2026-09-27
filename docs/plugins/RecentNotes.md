---
title: RecentNotes
description: 显示最近修改的笔记列表。
tags:
  - plugin/component
image:
repository: "[quartz-community/recent-notes](https://github.com/quartz-community/recent-notes)"
enabled: false
required: false
---

Shows recently modified notes.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[recent notes]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `title`: The title of the recent notes section. Defaults to `Recent notes`.
- `limit`: The maximum number of recent notes to display. Defaults to `3`.
- `showTags`: Whether to display the tags for each note. Defaults to `true`.
- `linkToMore`: A slug to a page that shows more notes. Defaults to `false`.
- `hideTagPages`: Whether to hide tag index pages from the list. Defaults to `false`.
- `hideFolderPages`: Whether to hide folder index pages from the list. Defaults to `false`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/recent-notes
  enabled: true
  options:
    limit: 3
    showTags: true
    hideTagPages: false
    hideFolderPages: false
```

## API

- Category: Component
- Function name: `ExternalPlugin.RecentNotes()`.
- 源码： [`quartz-community/recent-notes`](https://github.com/quartz-community/recent-notes)
- 安装： `npx quartz plugin add github:quartz-community/recent-notes`
