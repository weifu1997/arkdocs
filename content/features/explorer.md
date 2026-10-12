---
title: 文件浏览
tags:
  - component
---

Quartz 配备了文件浏览器（Explorer）组件，允许访客方便地浏览和导航站点上的所有文件与文件夹。它完整支持无限级嵌套文件夹，并且具备高度的可定制性。

> [!info] 提示
> Explorer 现在是一个社区插件。这既展示了外部插件如何扩展 Quartz 的功能，同时也为插件开发者提供了一个参考实现标准。

## 安装

Explorer 作为社区插件托管在 GitHub 上：

```bash
npm install github:quartz-community/explorer --legacy-peer-deps
```

然后将其添加到你的 `quartz.config.yaml` 中：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/explorer
    enabled: true
    layout:
      position: left
      priority: 50
```

## 功能特性

默认情况下，文件浏览树会显示页面上的所有文件夹和文件。如需将其展示在页面的不同位置，可以通过调整 [[layout|页面布局]] 来实现。

文件夹的展示名称由该文件夹下的 `folder/index.md` 中的 `title` Frontmatter 字段决定（详见 [[authoring content|撰写内容]]）。如果该文件不存在或未包含该字段，则默认直接使用本地文件夹名。

> [!info] 状态记忆
> Explorer 默认使用浏览器本地存储（Local Storage）来记忆折叠与展开状态，以确保页面跳转时浏览体验丝滑一致。
>
> 如需清理或重置本地存储中的目录树状态，可删除浏览器 Local Storage 中的 `fileTree` 键。你也可以通过在配置中传入 `useSavedState: false` 彻底禁用该状态记忆。

## 自定义配置

绝大多数配置都可以直接通过向 `Explorer()` 传递选项来完成。

例如，默认配置如下：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/explorer
    enabled: true
    options:
      title: 文件浏览
      folderClickBehavior: collapse # 点击文件夹行为："link"（跳转页面）或 "collapse"（展开/折叠）
      folderDefaultState: collapsed # 文件夹初始默认状态："collapsed"（折叠）或 "open"（展开）
      useSavedState: true # 是否持久化记住展开状态
    layout:
      position: left
      priority: 50
```

对于高级自定义逻辑（如自定义排序 `sort`、过滤 `filter` 和映射 `map` 函数），可以使用 `quartz.ts` 中的 TS 代码覆盖：

```ts title="quartz.ts"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import * as ExternalPlugin from "./.quartz/plugins"

// 高阶用法：传入无法在纯 YAML 中表达的 JavaScript 回调函数
ExternalPlugin.Explorer({
  sortFn: (a, b) => {
    /* 自定义排序逻辑 ... */
  },
  filterFn: (node) => {
    /* 自定义过滤逻辑 ... */
  },
  mapFn: (node) => {
    /* 自定义映射转换逻辑 ... */
  },
  order: ["filter", "map", "sort"],
})

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout()
```

> [!info] 覆盖机制如何工作
> 当你在 `quartz.ts` 中调用 `ExternalPlugin.Explorer({...})` 时，这些选项会被记录下来，并在构建过程中实例化组件时与 YAML 配置自动合并。优先级顺序遵循：`插件默认值 < YAML 配置 < quartz.ts 代码覆盖`。
>
> 如果安装了两个同名插件（例如通过 `--name` 安装了两个不同的 Explorer），可以使用 `plugins` 映射表进行命名消除歧义：
>
> ```ts title="quartz.ts"
> import * as ExternalPlugin from "./.quartz/plugins"
> ExternalPlugin.plugins["my-explorer"].Explorer({ mapFn: ... })
> ```

传递自定义配置时，任何不想改动的字段都可以直接省略，以保持其默认值。

其他常见定制场景：

- **移除文件浏览组件**：直接从 `quartz.config.yaml` 中移除 `explorer` 条目，或者将其设为 `enabled: false`。
  - （可选）：移除后，你可以将 [[table of contents|目录列表（TOC）]] 组件移到页面左侧边栏。
- **自定义 `sort`、`filter` 与 `map` 行为**：详见下文[[#高阶进阶定制]]。

## 高阶进阶定制

Explorer 组件允许你完全掌控其底层行为。你可以自由传入自定义的 `sort`（排序）、`filter`（过滤）与 `map`（映射）函数。
所有函数均基于 `FileTrieNode` 节点类操作，该类包含以下属性：

```ts title="@quartz-community/explorer"
class FileTrieNode {
  isFolder: boolean
  children: Array<FileTrieNode>
  data: ContentDetails | null
}
```

```ts
export type ContentDetails = {
  slug: FullSlug
  title: string
  links: SimpleSlug[]
  tags: string[]
  content: string
}
```

这些函数均为可选。默认情况下，系统仅使用基础的 `sort` 排序函数：

```ts title="默认排序函数"
// 排序规则：文件夹优先，其后是文件；文件夹与文件内部均按字母升序排列
ExternalPlugin.Explorer({
  sortFn: (a, b) => {
    if ((!a.isFolder && !b.isFolder) || (a.isFolder && b.isFolder)) {
      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    if (!a.isFolder && b.isFolder) {
      return 1
    } else {
      return -1
    }
  },
})
```

---

你可以为 `sortFn`、`filterFn` 和 `mapFn` 提供自己的实现。所有函数将按照 `order` 选项指定的顺序依次执行。这些函数的行为与原生的 `Array.prototype` 方法类似，不同之处在于它们会**就地直接修改**整棵 `FileNode` 树，而不是返回新树。

有关更多函数原理，可参考 MDN 文档：[Array.prototype.sort()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)、[Array.prototype.filter()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) 以及 [Array.prototype.map()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/map)。

类型定义如下：

```ts
type SortFn = (a: FileTrieNode, b: FileTrieNode) => number
type FilterFn = (node: FileTrieNode) => boolean
type MapFn = (node: FileTrieNode) => void
```

## 实用示例

以下示例展示了 `sort`、`map` 和 `filter` 的常见用法。

### 示例 1：使用 `sort` 字母升序排序

在 YAML 中设置基础选项：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/explorer
    enabled: true
    options:
      title: 文件浏览
      folderDefaultState: collapsed
```

如需完全自定义排序函数，使用 TS 覆盖：

```ts title="quartz.ts (覆盖配置)"
ExternalPlugin.Explorer({
  sortFn: (a, b) => {
    return a.displayName.localeCompare(b.displayName)
  },
})
```

### 示例 2：使用 `map` 统一修改显示名称

将所有文件节点（文件夹 + 文件）的展示名称全部转换为大写字母：

```ts title="quartz.ts (覆盖配置)"
ExternalPlugin.Explorer({
  mapFn: (node) => {
    node.displayName = node.displayName.toUpperCase()
    return node
  },
})
```

### 示例 3：使用 `filter` 排除指定目录或文件

通过提供排除名单数组来隐藏特定文件夹或文件：

```ts title="quartz.ts (覆盖配置)"
ExternalPlugin.Explorer({
  filterFn: (node) => {
    // 包含你想要隐藏的一切名称集合
    const omit = new Set(["authoring content", "tags", "advanced"])

    // 也可以使用 node.slug 或 node.data 上的任何字段进行判断
    // 注意：node.data 仅对磁盘上实际存在的文件有效
    return !omit.has(node.displayName.toLowerCase())
  },
})
```

### 示例 4：按 Tag 标签过滤隐藏文件

通过 `node.data.tags` 访问当前文件的标签列表，隐藏带特定标签的笔记：

```ts title="quartz.ts (覆盖配置)"
ExternalPlugin.Explorer({
  filterFn: (node) => {
    // 排除带有 "explorerexclude" 标签的文件
    return node.data?.tags?.includes("explorerexclude") !== true
  },
})
```

### 示例 5：在目录树中展示所有内容（不过滤 tags）

默认情况下，Explorer 会自动过滤隐藏 `tags` 标签文件夹。如需展示所有内容，可将过滤器设为 `undefined`：

```ts title="quartz.ts (覆盖配置)"
ExternalPlugin.Explorer({
  filterFn: undefined, // 不应用任何过滤，显示所有文件和文件夹
})
```

### 示例 6：为文件和文件夹添加 Emoji 图标前缀

使用 `mapFn` 为文件夹添加 📁 前缀，为文件添加 📄 前缀：

```ts title="quartz.ts (覆盖配置)"
ExternalPlugin.Explorer({
  mapFn: (node) => {
    if (node.isFolder) {
      node.displayName = "📁 " + node.displayName
    } else {
      node.displayName = "📄 " + node.displayName
    }
  },
})
```
