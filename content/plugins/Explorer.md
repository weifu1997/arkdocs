---
title: Explorer
description: "无限级嵌套的文件树目录浏览侧边栏组件。"
tags:
  - plugin/component
image:
repository: "[quartz-community/explorer](https://github.com/quartz-community/explorer)"
enabled: true
required: false
---

文件树浏览侧边栏组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/explorer|文件浏览功能详细指南]]。

## 配置选项

该插件接受以下配置选项：

**YAML 配置选项**（在 `quartz.config.yaml` 中配置）：

- `title`：文件浏览器的标题，默认为 `"文件浏览"`。
- `folderClickBehavior`：点击文件夹时的行为。可选 `"link"`（点击跳转到该文件夹的索引聚合页）或 `"collapse"`（点击直接切换展开/折叠）。默认为 `"collapse"`。
- `folderDefaultState`：文件夹的初始默认展开状态。可选 `"collapsed"`（折叠）或 `"open"`（展开）。默认为 `"collapsed"`。
- `useSavedState`：是否使用 Local Storage 本地存储持久化记忆用户的折叠展开状态。默认为 `true`。

**TS 代码覆盖选项**（在 `quartz.ts` 中配置，用于无法在 YAML 中表达的 JavaScript 回调函数）：

- `sortFn`：用于对文件和文件夹自定义排序的函数。
- `filterFn`：用于按规则排除隐藏特定节点的自定义过滤函数。
- `mapFn`：用于批量修改节点属性（如给展示名称加图标）的映射函数。
- `order`：控制上述处理函数执行顺序的数组。默认为 `["filter", "map", "sort"]`。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/explorer
  enabled: true
  options:
    title: 文件浏览
    folderClickBehavior: collapse
    folderDefaultState: collapsed
    useSavedState: true
```

### TS 覆盖示例

```ts title="quartz.ts"
import * as ExternalPlugin from "./.quartz/plugins"

// 必须放置在 loadQuartzConfig() 之前
ExternalPlugin.Explorer({
  mapFn: (node) => {
    node.displayName = node.displayName.toUpperCase()
    return node
  },
})
```

更多高级用法示例请参阅 [[features/explorer#高阶进阶定制|文件浏览高阶进阶定制]]。

## API

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Explorer()`
- 源码：[`quartz-community/explorer`](https://github.com/quartz-community/explorer)
- 安装：`npx quartz plugin add github:quartz-community/explorer`
