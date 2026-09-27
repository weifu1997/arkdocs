---
title: Explorer
description: 文件树浏览侧边栏。
tags:
  - plugin/component
image:
repository: "[quartz-community/explorer](https://github.com/quartz-community/explorer)"
enabled: true
required: false
---

File tree explorer sidebar.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[plugins/Explorer]] for detailed usage information.

## 配置

该插件接受以下配置选项：

**YAML options** (in `quartz.config.yaml`):

- `title`: The title of the explorer. Defaults to `Explorer`.
- `folderClickBehavior`: The behavior when a folder is clicked. Can be `"link"` to navigate or `"collapse"` to toggle. Defaults to `link`.
- `folderDefaultState`: The default state of folders. Can be `"collapsed"` or `"open"`. Defaults to `collapsed`.
- `useSavedState`: Whether to use local storage to save the state of the explorer. Defaults to `true`.

**TS override options** (in `quartz.ts`, for callback functions that can't be expressed in YAML):

- `sortFn`: Custom sort function for ordering files and folders.
- `filterFn`: Custom filter function to exclude specific nodes.
- `mapFn`: Custom map function to transform node properties (e.g. display names).
- `order`: Array controlling the order of operations. Defaults to `["filter", "map", "sort"]`.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/explorer
  enabled: true
  options:
    title: Explorer
    folderClickBehavior: link
    folderDefaultState: collapsed
    useSavedState: true
```

### TS override example

```ts title="quartz.ts"
import * as ExternalPlugin from "./.quartz/plugins"

// Must be placed before loadQuartzConfig()
ExternalPlugin.Explorer({
  mapFn: (node) => {
    node.displayName = node.displayName.toUpperCase()
    return node
  },
})
```

See [[features/explorer#Advanced customization]] for more examples.

## API

- Category: Component
- Function name: `ExternalPlugin.Explorer()`.
- 源码： [`quartz-community/explorer`](https://github.com/quartz-community/explorer)
- 安装： `npx quartz plugin add github:quartz-community/explorer`
