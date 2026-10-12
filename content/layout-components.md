---
title: 高阶布局组件
---

Quartz 提供了若干高阶组件，用于布局组合和响应式设计。这些组件会包装其他组件，以增加额外功能或修改其行为。

大多数常见用法都可以直接在 `quartz.config.yaml` 中通过布局属性配置。对于需要自定义逻辑的进阶场景，可以在 `quartz.ts` 中使用 TypeScript 覆盖。

## `Flex` 弹性盒组件

`Flex` 组件创建了一个[弹性盒子布局（Flexible Box Layout）](https://developer.mozilla.org/zh-CN/docs/Web/CSS/flex)，能够以多样化的方式排列子组件。它在构建响应式布局以及按行或按列组织组件时尤为实用。

### YAML 配置方式

在 YAML 中，弹性布局通过**分组（groups）**来创建。首先在顶层的 `layout.groups` 区域定义分组，然后通过各个插件自身的 `layout.group` 属性将插件关联到该分组：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/search
    enabled: true
    layout:
      position: left
      priority: 20
      group: toolbar
      groupOptions:
        grow: true # 搜索框将自动伸展以填充可用空间
  - source: github:quartz-community/darkmode
    enabled: true
    layout:
      position: left
      priority: 30
      group: toolbar # 暗色模式切换按钮保持自身自然尺寸
  - source: github:quartz-community/reader-mode
    enabled: true
    layout:
      position: left
      priority: 35
      group: toolbar

layout:
  groups:
    toolbar:
      direction: row
      gap: 0.5rem
```

每个插件条目上的 `groupOptions` 字段支持以下 Flex 弹性子项属性：

| 选项 | 类型 | 说明 |
| --------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| `grow` | `boolean` | 组件是否应当自动放大以填充剩余可用空间 |
| `shrink` | `boolean` | 空间不足时组件是否允许自动收缩 |
| `basis` | `string` | 组件在主轴上的初始基准尺寸（例如 `"200px"`） |
| `order` | `number` | 在弹性容器中的排列次序 |
| `align` | `"start"` \| `"end"` \| `"center"` \| `"stretch"` | 交叉轴（Cross-axis）对齐方式 |
| `justify` | `"start"` \| `"end"` \| `"center"` \| `"between"` \| `"around"` | 主轴（Main-axis）对齐方式 |

顶层的 `layout.groups` 区域用于配置弹性容器本身的属性：

| 选项 | 类型 | 说明 |
| ----------- | -------------------------------------------------------------- | ----------------------------------------- |
| `direction` | `"row"` \| `"row-reverse"` \| `"column"` \| `"column-reverse"` | 弹性排列方向（行、列或反向） |
| `wrap` | `"nowrap"` \| `"wrap"` \| `"wrap-reverse"` | 换行行为（不换行、换行或反向换行） |
| `gap` | `string` | 弹性子项之间的间隙距离（例如 `"0.5rem"`） |

### TS 覆盖方式

如需完全的代码级控制，可以在 `quartz.ts` 中直接使用 `Component.Flex()` 包装器：

```ts title="quartz.ts (覆盖配置)"
Component.Flex({
  components: [
    {
      Component: Plugin.Search(),
      grow: true, // 搜索框将自动伸展以填充可用空间
    },
    { Component: Plugin.Darkmode() }, // 暗色模式按钮保持自然尺寸
  ],
  direction: "row",
  gap: "1rem",
})
```

```typescript
type FlexConfig = {
  components: {
    Component: QuartzComponent
    grow?: boolean
    shrink?: boolean
    basis?: string
    order?: number
    align?: "start" | "end" | "center" | "stretch"
    justify?: "start" | "end" | "center" | "between" | "around"
  }[]
  direction?: "row" | "row-reverse" | "column" | "column-reverse"
  wrap?: "nowrap" | "wrap" | "wrap-reverse"
  gap?: string
}
```

> [!note] 覆盖默认样式行为
> 位于 `Flex` 内部的组件会自动添加一个额外的 CSS 类名 `flex-component`，并默认带有 `display: flex` 属性。如果你希望覆盖此行为，可以在自定义 CSS 文件中为该组件的类名显式指定 `display` 属性。
>
> ```scss
> .flex-component {
>   display: block; // 或任何其他所需的 display 显示类型
> }
> ```

## `MobileOnly` / `DesktopOnly` 设备端适配组件

这些组件用于控制某个插件仅在移动端或桌面端设备上可见。在构建特定组件只应在指定屏幕尺寸下展示的响应式布局时非常有用。

### YAML 配置方式

在 YAML 中，直接在插件的 `layout` 条目上配置 `display` 属性：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/table-of-contents
    enabled: true
    layout:
      position: right
      priority: 20
      display: desktop-only # 仅在桌面端可见
```

支持的 `display` 可选值：

| 取值 | 说明 |
| -------------- | ------------------------------------- |
| `all` | 在所有屏幕尺寸下均可见（默认值） |
| `mobile-only` | 仅在移动端设备上可见 |
| `desktop-only` | 仅在桌面端设备上可见 |

### TS 覆盖方式

如果采用 TS 代码覆盖方式，可以使用 `Component.MobileOnly()` 或 `Component.DesktopOnly()` 包装器：

```ts title="quartz.ts (覆盖配置)"
Component.MobileOnly(Component.Spacer())
```

```ts title="quartz.ts (覆盖配置)"
Component.DesktopOnly(Plugin.TableOfContents())
```

## `ConditionalRender` 条件渲染组件

`ConditionalRender` 组件可根据页面的元数据属性条件化地决定是否渲染某个插件。在希望组件仅在满足特定条件时才显现的动态布局中非常实用。

### YAML 配置方式

在 YAML 中，直接在插件的 `layout` 条目上使用 `condition` 属性。Quartz 提供了若干内置预设条件：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/breadcrumbs
    enabled: true
    layout:
      position: beforeBody
      priority: 5
      condition: not-index # 在网站根目录 index.md 首页上隐藏面包屑导航
```

内置的可用预设条件：

| 条件标识 | 说明 |
| --------------- | ----------------------------------------------------- |
| `not-index` | 仅当当前页面不是根目录 `index.md` 首页时才渲染 |
| `has-tags` | 仅当页面的 Frontmatter 元数据中包含 tags 标签时才渲染 |
| `has-backlinks` | 仅当页面拥有反向链接时才渲染 |
| `has-toc` | 仅当页面具备目录列表时才渲染 |

### TS 覆盖方式

如果需要内置预设无法满足的自定义条件，可以在 `quartz.ts` 中使用 `Component.ConditionalRender()`：

```ts title="quartz.ts (覆盖配置)"
Component.ConditionalRender({
  component: Plugin.Search(),
  condition: (props) => props.displayClass !== "fullpage",
})
```

```typescript
type ConditionalRenderConfig = {
  component: QuartzComponent
  condition: (props: QuartzComponentProps) => boolean
}
```

> [!tip] 提示
> 你还可以在插件的初始化代码中调用 `registerCondition()`，注册属于自己的自定义条件供 YAML 中直接引用。详见 [[making plugins|制作插件]]。
