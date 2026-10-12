---
title: 制作自定义插件
---

> [!warning] 前置知识要求
> 本指南假定你已经具备 TypeScript 开发经验，并将展示描述 Quartz 插件标准接口的代码示例。

Quartz 的插件体系本质上是对内容进行的一系列流水线转换，如下图所示：

![[quartz transform pipeline.png]]

所有插件均定义为一个接收单个选项参数 `type OptionType = object | undefined` 并返回对应类型实例对象的工厂函数：

```ts
type OptionType = object | undefined
type QuartzPlugin<Options extends OptionType = undefined> = (opts?: Options) => QuartzPluginInstance
type QuartzPluginInstance =
  | QuartzTransformerPluginInstance
  | QuartzFilterPluginInstance
  | QuartzEmitterPluginInstance
  | QuartzPageTypePluginInstance
```

在详细介绍每种插件类型之前，先明确几个核心上下文类型：

- `BuildCtx`：定义于 `@quartz-community/types`，包含构建上下文信息：
  - `argv`：传递给 Quartz [[cli/build|build 构建命令]] 的命令行参数；
  - `cfg`：完整的 Quartz [[configuration|全站配置]] 对象；
  - `allSlugs`：全站所有合法内容 Slug 路径列表（详见 [[paths|路径机制]]）。
- `StaticResources`：定义于 `@quartz-community/types`，包含全站需要加载的静态资源：
  - `css`：待加载的 CSS 样式定义列表（接收外部 CDN URL 或内联样式文本）；
  - `js`：待加载的 JavaScript 脚本列表（可指定加载时机 before/after DOM、是否为 ES Module 以及代码来源）；
  - `additionalHead`：需要注入到页面 `<head>` 标签中的 JSX 元素列表或动态函数。

## 快速起步

在 Quartz v5 中，插件是独立的代码仓库。最便捷的创建方式是使用官方脚手架模板：

```shell
# 使用插件模板在 GitHub 上创建新仓库，然后克隆到本地
git clone https://github.com/your-username/my-plugin.git
cd my-plugin
npm install
```

模板预设了现代打包配置（`tsup.config.ts`）、TypeScript 环境以及规范的包结构。

## 插件目录结构

标准插件的项目目录结构如下：

```
my-plugin/
├── src/
│   └── index.ts          # 插件代码入口点
├── tsup.config.ts         # tsup 编译打包配置
├── package.json           # 依赖与清单描述文件
└── tsconfig.json          # TypeScript 编译器配置
```

插件的 `package.json` 应声明对 `@quartz-community/types`（类型定义）以及 `@quartz-community/utils`（共享工具库）的依赖。

## 插件分类与选型

Quartz 支持六种插件能力角色，一个插件可以同时融合多种角色：

| 我的诉求是…… | 适用的插件类型 |
| ------------------------------------------------ | ----------- |
| 转换加工 Markdown 或 HTML 内容 | **转换器（Transformer）** |
| 决定哪些页面允许发布、哪些予以剔除 | **过滤器（Filter）** |
| 输出最终产物文件（RSS、Sitemap、重定向、静态资源） | **发射器（Emitter）** |
| 定义某一分类页面的专属渲染逻辑 | **页面类型（Page Type）** |
| 向页面布局插槽添加可视化交互组件 | **组件（Component）** |
| 为 Bases 多维数据库系统扩展全新的视图渲染模式 | **Bases 视图（Bases View）** |

这些分类**并非互斥关系**。例如：
- `obsidian-flavored-markdown` 既是**转换器**（处理 OFM 双链和语法），又提供**组件**（Mermaid 图表渲染）；
- `canvas-page` 是**页面类型**，同时也提供了自定义**页面框架（Page Frame）**；
- 一个插件可以既是增加元数据的**转换器**，又是展现该元数据的**组件**。

---

### 1. 转换器插件（Transformers）

转换器负责对内容进行**映射加工（Map）**，输入 Markdown 文件，输出修改后的内容语法树或向文件附加额外元数据。

```ts
export type QuartzTransformerPluginInstance = {
  name: string
  textTransform?: (ctx: BuildCtx, src: string) => string
  markdownPlugins?: (ctx: BuildCtx) => PluggableList
  htmlPlugins?: (ctx: BuildCtx) => PluggableList
  externalResources?: (ctx: BuildCtx) => Partial<StaticResources>
}
```

所有转换器插件必须定义 `name` 字段，并可按需实现以下生命周期钩子：

- `textTransform`：在文件被解析为 [Markdown 抽象语法树（mdast）](https://github.com/syntax-tree/mdast) **之前**执行文本到文本的字符串预处理；
- `markdownPlugins`：返回一组 [remark 插件列表](https://github.com/remarkjs/remark/blob/main/doc/plugins.md)，用于结构化操作和转换 Markdown AST；
- `htmlPlugins`：返回一组 [rehype 插件列表](https://github.com/rehypejs/rehype/blob/main/doc/plugins.md)，用于结构化操作和转换 HTML AST（hast）；
- `externalResources`：声明该插件在浏览器客户端工作时所需的外部 CSS 或 JS 资源。

借用 `remark` 与 `rehype` 生态的典型范例是 [[features/Latex|LaTeX 数学公式]] 插件：

```ts
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import rehypeMathjax from "rehype-mathjax/svg"
import { QuartzTransformerPlugin } from "@quartz-community/types"

interface Options {
  renderEngine: "katex" | "mathjax"
}

export const Latex: QuartzTransformerPlugin<Options> = (opts?: Options) => {
  const engine = opts?.renderEngine ?? "katex"
  return {
    name: "Latex",
    markdownPlugins() {
      return [remarkMath]
    },
    htmlPlugins() {
      if (engine === "katex") {
        return [[rehypeKatex, { output: "html" }]]
      } else {
        return [rehypeMathjax]
      }
    },
    externalResources() {
      if (engine === "katex") {
        return {
          css: [{ content: "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" }],
          js: [{
            src: "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/copy-tex.min.js",
            loadTime: "afterDOMReady",
            contentType: "external",
          }],
        }
      }
    },
  }
}
```

转换器另一常见应用是解析并向文件挂载自定义扩展数据：

```ts
import { QuartzTransformerPlugin } from "@quartz-community/types"

export const AddWordCount: QuartzTransformerPlugin = () => {
  return {
    name: "AddWordCount",
    markdownPlugins() {
      return [
        () => (tree, file) => {
          const text = String(file.value)
          file.data.wordcount = text.split(/\s+/).length
        },
      ]
    },
  }
}

// 声明类型合并，使 TypeScript 和其他插件知晓该自定义字段
declare module "vfile" {
  interface DataMap {
    wordcount: number
  }
}
```

---

### 2. 过滤器插件（Filters）

过滤器负责对内容进行**条件筛选（Filter）**，接收所有转换器的输出，裁决哪些页面应正式发布、哪些应予丢弃。

```ts
export type QuartzFilterPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzFilterPluginInstance

export type QuartzFilterPluginInstance = {
  name: string
  shouldPublish(ctx: BuildCtx, content: ProcessedContent): boolean
}
```

过滤器必须实现 `shouldPublish` 函数，接收经过全部转换器处理后的内容对象，返回 `true`（允许传递给发射器输出）或 `false`（丢弃拦截）。

内置的草稿过滤插件示例：

```ts
import { QuartzFilterPlugin } from "@quartz-community/types"

export const RemoveDrafts: QuartzFilterPlugin<{}> = () => ({
  name: "RemoveDrafts",
  shouldPublish(_ctx, [_tree, vfile]) {
    const draftFlag = vfile.data?.frontmatter?.draft ?? false
    return !draftFlag
  },
})
```

---

### 3. 发射器插件（Emitters）

发射器负责对内容进行**归约汇总（Reduce）**，读取所有经转换和过滤后的内容清单，生成并输出实体文件到目标磁盘。

```ts
export type QuartzEmitterPlugin<Options extends OptionType = undefined> = (
  opts?: Options,
) => QuartzEmitterPluginInstance

export type QuartzEmitterPluginInstance = {
  name: string
  emit(
    ctx: BuildCtx,
    content: ProcessedContent[],
    resources: StaticResources,
  ): Promise<FilePath[]> | AsyncGenerator<FilePath>
  partialEmit?(
    ctx: BuildCtx,
    content: ProcessedContent[],
    resources: StaticResources,
    changeEvents: ChangeEvent[],
  ): Promise<FilePath[]> | AsyncGenerator<FilePath> | null
  getQuartzComponents(ctx: BuildCtx): QuartzComponent[]
}
```

- `emit`：遍历所有解析与过滤后的内容，输出目标文件并返回生成的文件路径数组。
- `partialEmit`：可选的增量构建钩子。它接收文件改动事件数组（`changeEvents`），支持仅选择性地重新构建受影响的特定页面，极大提升本地开发热重载速度。若未提供则默认回退执行 `emit`。
- `getQuartzComponents`：声明当前发射器用于组装页面所依赖的全部 `QuartzComponent` 组件。

文本文件的输出推荐使用 `@quartz-community/utils` 提供的 `write` 函数，它会自动确保上级目录存在：

```ts
export type WriteOptions = (data: {
  ctx: BuildCtx
  slug: FullSlug // 生成文件的 Slug 名称（不含后缀）
  ext: `.${string}` | "" // 扩展名（如 ".html"）
  content: string // 写入的正文内容
}) => Promise<FilePath>
```

---

### 4. 页面类型插件（Page Types）

页面类型插件定义了某一特定分类页面的排版与渲染逻辑，是 Quartz 支持新文件格式或虚拟页面的核心方式。

```ts
export interface QuartzPageTypePluginInstance {
  name: string
  priority?: number
  fileExtensions?: string[]
  match: PageMatcher
  generate?: PageGenerator
  layout: string
  frame?: string
  body: QuartzComponentConstructor
}
```

- `name`：页面类型的唯一标识名；
- `priority`：匹配优先级（数值越高越先检查，默认为 `0`）；
- `fileExtensions`：该页面类型接管的文件扩展名数组（例如 `[".canvas"]`、`[".base"]`）；
- `match`：用于判断某个 Slug 或文件是否应交由该页面类型渲染的匹配函数；
- `generate`：可选函数，用于生成磁盘上不存在物理实体的“虚拟页面”（如文件夹索引页或标签归档页）；
- `layout`：关联的布局配置键名（例如 `"content"`、`"folder"`、`"tag"`），决定读取 YAML 配置中的哪个 `byPageType` 槽位覆盖；
- `frame`：采用的[[layout#页面框架（Page Frames）|页面框架]]（如 `"default"`、`"full-width"`、`"minimal"` 或自定义框架）；
- `body`：负责渲染页面正文主体内容的组件构造器。

#### 提供自定义页面框架（Providing Custom Frames）

插件可以导出属于自己的页面框架，控制页面的整体外壳结构（例如全屏白板、演示文稿模式或仪表盘布局）：

1. **创建框架文件**：

```tsx title="src/frames/MyFrame.tsx"
import type { PageFrame, PageFrameProps } from "@quartz-community/types"

export const MyFrame: PageFrame = {
  name: "my-frame",
  css: `
.page[data-frame="my-frame"] > #quartz-body {
  grid-template-columns: 1fr;
  grid-template-areas: "center";
}
`,
  render({ componentData, pageBody: Content, footer: Footers }: PageFrameProps) {
    return (
      <div class="center">
        {(Content as any)(componentData)}
        {Footers.map((Footer) => (Footer as any)(componentData))}
      </div>
    )
  },
}
```

2. **在 `package.json` 清单中导出框架声明**：

```json title="package.json"
{
  "exports": {
    ".": "./dist/index.js",
    "./frames": "./dist/frames/index.js"
  },
  "quartz": {
    "frames": {
      "MyFrame": { "exportName": "MyFrame" }
    }
  }
}
```

---

### 5. Bases 数据库视图开发（Bases Views）

`bases-page` 数据库插件提供了类似 Obsidian Bases 的多维表格视图系统。其他插件可通过 `viewRegistry` 注册全新的视图渲染器：

```ts
import { viewRegistry } from "@quartz-community/bases-page"

viewRegistry.register({
  id: "timeline",
  name: "时间线视图",
  icon: "git-branch",
  render: ({ entries, view, slug }) => (
    <div class="bases-timeline">
      {entries.map(entry => <div>{entry.properties.title}</div>)}
    </div>
  ),
  css: `.bases-timeline { display: flex; flex-direction: column; }`,
  afterDOMLoaded: `document.addEventListener("nav", () => { /* 交互初始化 */ })`,
})
```

---

## 构建与分发规范

Quartz v5 插件在发布到仓库时**必须附带预编译好的 `dist/` 产物**。当用户通过 CLI 安装插件时，Quartz 检测到已有构建产物便会直接跳过冗长的 npm install 和 build 流程，实现秒级即时安装。

### 打包配置原则

脚手架的 `tsup.config.ts` 默认将绝大多数外部依赖直接打包进单文件，仅保留单例共享包（Singleton Externals）：

```ts
const SINGLETON_EXTERNALS = [
  "preact",
  "preact/hooks",
  "preact/jsx-runtime",
  "preact/compat",
  "@jackyzha0/quartz",
  "vfile",
  "unified",
]

export default defineConfig({
  noExternal: [/.*/], // 打包所有常规依赖
  external: SINGLETON_EXTERNALS, // 排除单例包
})
```

### 包含 Native 本地依赖的插件

如果插件依赖包含 C/C++ 本地二进制绑定的包（如用于图片处理的 `sharp`），该包无法直接打包进 JS 单文件。此时需：
1. 在插件 `package.json` 的 quartz 清单中标记 `"requiresInstall": true`；
2. 将该本地包声明为 `peerDependencies`；
3. Quartz 会在用户本地构建时自动将其正确安装。

---

## 模块导入速查表

| 你需要…… | 正确的导入来源 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 类型定义（`QuartzTransformerPlugin`、`QuartzComponent` 等） | `@quartz-community/types` |
| 路径工具函数（`simplifySlug`、`resolveRelative`、`pathToRoot`） | `@quartz-community/utils/path` |
| DOM 辅助函数（`removeAllChildren`、`registerEscapeHandler`） | `@quartz-community/utils/dom` |
| JSX 转换工具（`htmlToJsx`） | `@quartz-community/utils/jsx` |
| 日期与排序辅助（`formatDate`、`byDateAndAlphabetical`） | `@quartz-community/utils/date` 与 `@quartz-community/utils/sort` |
| 客户端浏览器运行时（`onNav`、`onRender`、`fetchContentIndex`） | `@quartz-community/runtime` |

> [!warning] 规范要求
> **切勿**直接从 `@jackyzha0/quartz` 或 `vfile` 导入模块，请始终统一使用 `@quartz-community/*` 社区包。

---

## 国际化多语言（i18n）规范

插件内部切勿将面向用户的界面文字硬编码在组件中，请遵循标准的 i18n 目录结构：

```
src/i18n/
├── index.ts
└── locales/
    ├── en-US.ts      # 基础兜底英文包
    └── zh-CN.ts      # 简体中文包
```

在组件中根据全局 `cfg.locale` 动态获取对应语言包：

```tsx
import { i18n } from "../i18n"

const MyComponent: QuartzComponent = ({ cfg }) => {
  const t = i18n(cfg.locale ?? "en-US").components.myPlugin
  return <h2>{t.title}</h2>
}
```

---

## 安装与测试你的插件

在你的 Quartz 根目录中执行：

```shell
npx quartz plugin add github:你的用户名/my-plugin
```

该命令会自动将插件登记入 `quartz.config.yaml` 和 `quartz.lock.json`。随后即可直接在配置文件中启用并设置选项参数。
