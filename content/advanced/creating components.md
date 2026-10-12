---
title: 创建自定义组件插件
---

> [!warning] 前置知识要求
> 本指南假定你已经具备 JavaScript 编程经验，并熟悉 TypeScript 与 JSX 语法。

在常规 Web 开发中，我们使用 HTML 来编写页面骨架：

```html
<article>
  <h1>文章大标题</h1>
  <p>段落内容</p>
</article>
```

这段 HTML 代表一篇文章，包含一个大标题和一个段落，再配合 CSS 进行样式美化，并通过 JavaScript 添加交互逻辑。

然而，原生 HTML 无法构建可复用的组件模板。如果你想创建新页面，就必须手动复制粘贴上述结构并手动修改内容。当网站拥有大量结构相似的页面时，这种模式就会变得极其难以维护。React 的设计者们提出了**组件（Component）**的概念——即返回 JSX 结构的 JavaScript 函数——来优雅地解决视图复用问题。

本质上，组件允许你编写一个接收数据并输出 HTML 的函数。**虽然 Quartz 底层并没有使用 React，但它采用了完全相同的组件理念，让你能够用极具表现力的方式为你的 Quartz 站点构建灵活的布局模板。**

## 社区组件插件体系

在 Quartz v5 中，绝大多数页面组件都是独立的社区插件——即导出 `QuartzComponent` 的独立代码仓库。这些插件与 Quartz 核心仓库完全解耦，极大提升了组件的可维护性与社区共享能力。

### 快速起步

你可以使用官方提供的插件脚手架模板一键创建组件插件：

```shell
git clone https://github.com/quartz-community/plugin-template.git my-component
cd my-component
npm install
```

### 插件目录结构与入口

组件插件的 `src/index.ts` 通常导出一个构造器函数（Constructor），该函数返回一个 `QuartzComponent`。这允许用户在使用时向你的组件传递自定义配置参数：

```tsx title="src/index.ts"
import {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"

interface Options {
  favouriteNumber: number
}

const defaultOptions: Options = {
  favouriteNumber: 42,
}

const MyComponent: QuartzComponentConstructor<Options> = (userOpts?: Options) => {
  const opts = { ...defaultOptions, ...userOpts }

  const Component: QuartzComponent = (props: QuartzComponentProps) => {
    if (opts.favouriteNumber < 0) return null
    return <p>我的幸运数字是 {opts.favouriteNumber}</p>
  }

  return Component
}

export default MyComponent
```

### 组件属性（Props）

所有 Quartz 组件接收完全一致的上下文属性参数：

```tsx
export type QuartzComponentProps = {
  fileData: QuartzPluginData
  cfg: GlobalConfiguration
  tree: Node<QuartzPluginData>
  allFiles: QuartzPluginData[]
  displayClass?: "mobile-only" | "desktop-only"
}
```

- `fileData`：前置处理流水线为当前页面添加的全部元数据。
  - `fileData.slug`：当前页面的标准 Slug 路径；
  - `fileData.frontmatter`：解析出的 Frontmatter 元数据。
- `cfg`：`quartz.config.yaml` 中的全局通用配置对象。
- `tree`：当前页面经过完整解析转换后的 [HTML AST 语法树（hast）](https://github.com/syntax-tree/hast)。
- `allFiles`：全站所有已被解析文章的元数据数组。在制作文章归档列表或计算全站关系网络时极其有用。
- `displayClass`：指示用户偏好的辅助类名（用于在移动端或桌面端差异化展示）。

### 样式表管理（Styling）

在社区组件插件中，样式直接随插件打包。你可以通过在组件对象上挂载 `.css` 属性来声明样式：

```tsx
Component.css = `
  .my-component { color: #38bdf8; }
`
```

如果使用 SCSS，可以直接导入并在打包时赋予 `.css` 属性，构建系统会自动完成编译：

```tsx
import styles from "./styles.scss"
Component.css = styles
```

> [!warning] 全局样式作用域警告
> Quartz 没有使用 CSS Modules，因此在此声明的任何样式都属于**全局作用域**。如果你希望样式仅作用于自身组件，请务必使用具象独特的命名空间类名进行选择器约束。

### 国际化多语言支持（i18n）

组件中的任何面向用户的界面文本都应遵循 i18n 规范模式。详见 [[making plugins#国际化多语言（i18n）|制作插件]] 的完整配置指南。

简要代码参考：

```tsx
import { i18n } from "../i18n"

const MyComponent: QuartzComponent = ({ cfg }) => {
  const t = i18n(cfg.locale ?? "en-US").components.myComponent
  return <h2>{t.title}</h2>
}
```

请确保始终提供 `en-US` 作为后备兜底语言包。

### 客户端脚本与交互逻辑（Scripts and Interactivity）

如需实现浏览器端交互逻辑，可在组件上声明 `.beforeDOMLoaded` 与 `.afterDOMLoaded` 属性。它们是包含待在浏览器中执行的 JavaScript 代码的纯字符串。

- `.beforeDOMLoaded`：在页面 DOM 完成载入**之前**执行。常用于预拉取或早期主题初始化。
- `.afterDOMLoaded`：在页面 DOM 完全载入**之后**执行。

如果在编写 `afterDOMLoaded` 脚本时需要依赖随着页面路由切换而变动的特定元素，请务必监听全局 `"nav"` 路由事件：

```ts
document.addEventListener("nav", () => {
  // 编写针对当前页面特定元素的交互逻辑
  const toggleSwitch = document.querySelector("#switch") as HTMLInputElement
  if (toggleSwitch) {
    toggleSwitch.addEventListener("change", switchTheme)
    // 注册页面销毁时的清理函数，防止内存泄漏
    window.addCleanup(() => toggleSwitch.removeEventListener("change", switchTheme))
  }
})
```

你也可以监听 `"prenav"` 事件，它在 SPA 单页导航即将替换页面前触发。

当 DOM 在不经过全页跳转的情况下局部原位更新时（例如文章解密），会派发 `"render"` 事件。建议同时监听这两个事件以确保事件处理函数的鲁棒性：

```ts
function setupMyComponent() {
  const elements = document.querySelectorAll(".my-interactive")
  for (const el of elements) {
    el.addEventListener("click", handleClick)
    window.addCleanup(() => el.removeEventListener("click", handleClick))
  }
}

document.addEventListener("nav", setupMyComponent)
document.addEventListener("render", setupMyComponent)
```

在 SPA 环境下，推荐始终通过 `window.addCleanup` 注册清理函数，彻底杜绝内存泄漏和重复绑定。

#### 编译并内联客户端脚本

插件脚手架模板在其 `tsup.config.ts` 中内置了 `inlineScriptPlugin`，能够将作为文本导入的 `.inline.ts` 脚本在构建时自动转译为与浏览器完全兼容的内联 JavaScript：

```tsx title="src/index.ts"
import script from "./script.inline.ts"

const Component: QuartzComponent = (props) => {
  return <button id="btn">点击我</button>
}
Component.afterDOMLoaded = script
```

### 安装与使用你的组件

当组件开发完成并发布（例如推送到 GitHub 或 npm）后，用户即可通过 Quartz CLI 一键安装：

```shell
npx quartz plugin add github:你的用户名/my-component
```

随后直接在 `quartz.config.yaml` 中配置启用并挂载槽位：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:你的用户名/my-component
    enabled: true
    options:
      favouriteNumber: 42
    layout:
      position: left
      priority: 60
```

### 纯组件插件接收 YAML 配置

对于同时兼任处理流水线角色（Transformer、Filter、Emitter、PageType）的插件，配置项会自动传入工厂函数。然而，**纯组件插件（Component-only plugins）**——即其 Manifest 中仅声明了 `"category": ["component"]` 的插件——由于是通过副作用直接加载的，并不走工厂路径。

如需让纯组件插件接收 YAML 配置，只需在其入口点导出一个 `init` 初始化函数：

```ts title="src/index.ts"
export function init(options?: Record<string, unknown>): void {
  // options 包含合并后的 defaultOptions 与用户在 YAML 中填写的配置
  const myFlag = (options?.myFlag as boolean) ?? false
}
```

并在 `package.json` 的清单中声明默认参数：

```json title="package.json"
{
  "quartz": {
    "category": ["component"],
    "defaultOptions": {
      "myFlag": false
    }
  }
}
```

## 内置基础布局组件

Quartz 核心还内置了一组基础结构性布局组件（位于 `quartz/components/`）：

- `Component.Head()` —— 渲染 HTML `<head>` 标签；
- `Component.Spacer()` —— 提供自适应弹性伸缩空白空间；
- `Component.Flex()` —— 弹性盒子布局容器；
- `Component.MobileOnly()` —— 仅在移动端显示的响应式包装器；
- `Component.DesktopOnly()` —— 仅在桌面端显示的响应式包装器；
- `Component.ConditionalRender()` —— 根据页面元数据条件化渲染。

详见 [[layout-components|高阶布局组件]] 了解更多使用技巧。
