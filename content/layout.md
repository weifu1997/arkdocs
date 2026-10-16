---
title: 页面布局
---

某些静态站点生成器直接输出 [HTML](https://developer.mozilla.org/zh-CN/docs/Web/HTML) 文件。为了便于自由定制，Quartz 允许你完全重新编排和组织页面布局。

在 Quartz v5 中，布局完全由 `quartz.config.yaml` 统筹定义。每个插件通过自身的 `layout.position`（摆放位置）和 `layout.priority`（排序优先级）字段控制自身在页面中的呈现。顶层的 `layout` 字段还提供了两种额外的高阶机制：

- `layout.groups`：定义弹性盒子容器（如 `toolbar`），将多个组件合并在同一行或同一列中。详见 [[layout-components|高阶布局组件]]。
- `layout.byPageType`：针对特定页面类型（内容页 content、文件夹页 folder、标签页 tag、404 未找到页）覆盖 beforeBody、left、right 区域的组件，并可通过 `template` 指定该页面的[[#页面框架（Page Frames）|页面框架]]。

每个页面都由若干不同的槽位（Sections）组合而成，这些槽位中盛放着 `QuartzComponent` 组件。下面的代码列出了所有可向其添加组件的有效槽位区域：

```typescript title="quartz/cfg.ts"
export interface FullPageLayout {
  head: QuartzComponent // 单个组件，负责 HTML head 元数据
  header: QuartzComponent[] // 横向水平排列的顶栏组件
  beforeBody: QuartzComponent[] // 位于正文上方垂直排列的组件
  pageBody: QuartzComponent // 单个核心组件，负责渲染 Markdown 页面主体
  afterBody: QuartzComponent[] // 位于正文下方垂直排列的组件
  left: QuartzComponent[] // 左侧边栏：在桌面和平板端垂直排列，移动端水平排列
  right: QuartzComponent[] // 右侧边栏：在桌面端垂直排列，平板和移动端水平排列
  footer: QuartzComponent[] // 页脚区域：垂直排列的组件
}
```

这些槽位对应页面中的实际区域如下：

| 布局模式 | 预览图 |
| ------------------------------- | ----------------------------------- |
| 桌面端（屏幕宽度 > 1200px） | ![[quartz-layout-desktop.png\|800]] |
| 平板端（800px < 屏幕宽度 < 1200px） | ![[quartz-layout-tablet.png\|800]] |
| 移动端（屏幕宽度 < 800px） | ![[quartz-layout-mobile.png\|800]] |

> [!note] 补充说明
> 上图中有两个额外的布局字段未直接绘制：
>
> 1. `head`：渲染 HTML 文档中的 `<head>` [标签](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/head)。它在页面上不可见，仅负责浏览器标签页标题、外部脚本及样式表等元数据。
> 2. `header`：在 `beforeBody` 之前水平横向排布的一组组件。在插件配置中设置 `layout.position: header` 即可将组件放置于此。这可以实现类似 Quartz 3 带有标题、搜索框和深色模式切换的横向顶栏布局。

布局组件主要在 `quartz.config.yaml` 的插件列表和 `layout` 部分中配置。各个插件声明自身的位置与优先级，布局引擎会自动完成排布：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/explorer
    enabled: true
    layout:
      position: left
      priority: 50
  - source: github:quartz-community/graph
    enabled: true
    layout:
      position: right
      priority: 10
  - source: github:quartz-community/search
    enabled: true
    layout:
      position: left
      priority: 20
  - source: github:quartz-community/backlinks
    enabled: true
    layout:
      position: right
      priority: 30
  - source: github:quartz-community/article-title
    enabled: true
    layout:
      position: beforeBody
      priority: 10
  - source: github:quartz-community/content-meta
    enabled: true
    layout:
      position: beforeBody
      priority: 20
  - source: github:quartz-community/tag-list
    enabled: true
    layout:
      position: beforeBody
      priority: 30
  - source: github:quartz-community/darkmode
    enabled: true
    layout:
      position: header
      priority: 10
  - source: github:quartz-community/footer
    enabled: true
    options:
      links:
        GitHub: https://github.com/jackyzha0/quartz
        Discord Community: https://discord.gg/cRFFHYye7t
    layout:
      position: footer
      priority: 50

layout:
  groups:
    toolbar:
      direction: row
      gap: 0.5rem
  byPageType:
    content: {}
    folder:
      exclude:
        - reader-mode
      positions:
        right: []
    tag:
      exclude:
        - reader-mode
      positions:
        right: []
    "404":
      positions:
        beforeBody: []
        left: []
        right: []
```

### 条件化渲染

插件可以在自身的 `layout` 块中声明 `condition`（条件）来精确控制何时展示。这可以使用系统内置的预设条件：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/breadcrumbs
    enabled: true
    layout:
      position: beforeBody
      priority: 5
      condition: not-index
```

常用内置条件：

| 条件标识 | 效果 |
| ----------- | ---------------------------------------------------- |
| `not-index` | 在根目录首页（`index.md`）上隐藏，在其他所有页面上正常展示 |
| `has-tags` | 仅在 Frontmatter 中包含 tags 标签的页面上展示 |

有关条件渲染和显示控制的更多细节，请参见 [[layout-components|高阶布局组件]]。

如需使用 TypeScript 进行高级布局逻辑覆盖（例如自定义组件包装器或复杂的条件判断逻辑），可以使用 `quartz.ts` 中的 TS 覆盖机制：

```ts title="quartz.ts"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout({
  defaults: {
    // 覆盖所有页面类型的全局默认布局
  },
  byPageType: {
    content: {
      // 仅覆盖普通内容文章页的布局
    },
    folder: {
      // 仅覆盖文件夹聚合页的布局
    },
  },
})
```

在 `defaults` 中定义的配置项可以被 `byPageType` 中的专门条目精准覆盖。

社区组件插件可通过 `npx quartz plugin add github:quartz-community/<名称>` 安装。有关内置布局工具（Flex、MobileOnly、DesktopOnly 等），请查阅 [[layout-components|高阶布局组件]]。

如果你有兴趣进一步扩展定制 Quartz 的底层交互，也可以阅读 [[creating components|创建自定义组件]] 指南。

### 页面框架（Page Frames）

页面框架（Page Frames）决定了页面的整体 HTML 外骨架结构——具体而言，即侧边栏、顶栏、正文内容区以及页脚等布局插槽在页面外壳中如何进行排版。不同的页面类型可以使用不同的框架来呈现截然不同的视觉骨架。

Quartz 内置附带了三种标准页面框架：

| 框架名 | 描述说明 | 适用页面 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `default` | 三栏标准布局：包含左侧边栏、中央内容区（顶栏、beforeBody、主内容、afterBody）、右侧边栏以及页脚。这是 Quartz 最经典的默认布局。 | ContentPage（内容页）、FolderPage（目录页）、TagPage（标签页）、BasesPage |
| `full-width` | 无侧边栏。横跨全宽的单栏居中流式布局，包含顶栏、内容区、afterBody 以及页脚。 | — |
| `minimal` | 极简模式：无侧边栏，不显示顶栏与 beforeBody 装饰。仅包含正文内容和页脚。 | NotFoundPage（404 错误页） |

插件还可以自带注册自定义页面框架。例如，`canvas-page` 白板插件就自带了一个 `"canvas"` 全屏框架，提供支持侧边栏抽屉折叠的全屏白板画布。

#### 框架的解析优先级

每个页面类型插件可以在其源码中通过 `frame` 属性声明其默认框架。最终框架的解析优先级为：

1. **YAML 配置显式覆盖**：`quartz.config.yaml` 中的 `layout.byPageType.<name>.template`
2. **插件注册的框架**：插件通过 Frame Registry 注册的框架（从插件导出的 `./frames` 加载）
3. **插件内置默认声明**：页面类型插件源码中设置的 `frame` 属性
4. **后备兜底框架**：`"default"` 标准框架

例如，如果想让白板页面使用极简无侧栏框架：

```yaml title="quartz.config.yaml"
layout:
  byPageType:
    canvas:
      template: minimal
```

#### 自定义框架开发

可以通过两种途径引入自定义框架：

**1. 插件自带框架（推荐用于可复用框架）：**

插件可以通过在 `package.json` 中声明并在 `./frames` 子路径导出自己的框架。详见[[making plugins#提供自定义页面框架（Providing Custom Frames）|制作插件]]指南。安装包含框架的插件后，其框架会自动注册到 Frame Registry，并可通过名称直接引用。

**2. 核心源码框架（用于项目本地专属框架）：**

你也可以在本地 `quartz/components/frames/` 目录下直接编写框架代码：实现 `PageFrame` 接口，并在 `quartz/components/frames/index.ts` 中注册该框架。完整的 `PageFrame` 接口定义请参阅[[architecture|架构概览]]。

页面框架会被挂载为 `.page` 元素上的 `data-frame` 属性，方便通过 CSS/SCSS 进行针对性样式定制：

```scss
.page[data-frame="my-frame"] > #quartz-body {
  /* 自定义网格布局样式 */
}
```

框架的 CSS 建议始终使用 `[data-frame="name"]` 前缀选择器进行作用域隔离，防止不同框架之间发生样式污染。

### 响应式断点（Layout Breakpoints）

Quartz 会根据访问站点的屏幕宽度自适应调整布局结构。

断点数值可在 `variables.scss` 中集中配置：

- `mobile`：屏幕宽度小于该值时采用移动端布局。
- `desktop`：屏幕宽度大于该值时采用桌面端布局。
- 屏幕宽度介于 `mobile` 与 `desktop` 之间时，自动采用平板端（Tablet）布局。

```scss
$breakpoints: (
  mobile: 800px,
  desktop: 1200px,
);
```

### 样式与主题（Style）

大多数基础样式调整（例如调色板配色方案、字体等）均可直接通过[[configuration#通用配置|通用配置]]项轻松修改。不过，如果你想进行更加深入自由的界面重构，可以直接编写专属的样式表代码。Quartz 使用 [Sass / SCSS](https://sass-lang.com/guide/) 编写样式。

可以在 `quartz/styles/base.scss` 查看系统底层基础样式，并在 `quartz/styles/custom.scss` 中编写属于你自己的定制样式。

> [!note] 组件专属样式
> 某些特定组件还会打包自带专属样式！社区插件通常也会自带独立的样式文件。如果你想针对某个特定组件进行深度样式定制，请查看该组件的源码定义，了解其 CSS 类名及结构。
