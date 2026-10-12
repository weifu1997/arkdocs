---
title: 代码语法高亮
tags:
  - feature/transformer
---

Quartz 中的代码语法高亮完全在**构建阶段（Build-time）**静态预渲染完成。这意味着 Quartz 在打包时就已经将高亮着色直接计算为 CSS，无需在浏览器端加载任何庞大沉重的高亮 JavaScript 运行时库。

此外，与许多粗糙的客户端正则表达式高亮库不同，Quartz 使用了完整的 TextMate 语法解析器，提供与专业代码编辑器极度一致的高精度着色。

简而言之，它生成的代码渲染效果与你在 VS Code 等现代编辑器中看到的一模一样。其底层由 [Rehype Pretty Code](https://rehype-pretty-code.netlify.app/) 和 [Shiki](https://github.com/shikijs/shiki) 强力驱动。

> [!warning] 构建速度提示
> 如果你的笔记中包含大量长篇代码片段，语法高亮会在一定程度上影响构建耗时。

## 代码格式与用法

行内使用单个反引号包裹的文本会被渲染为行内代码：`console.log()`。

多行代码使用三反引号块包裹：

````markdown
```ts
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```
````

```ts
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```

### 代码块标题（Title）

在代码块声明后添加 `title="..."` 即可为代码块附加文件名标题栏：

````markdown
```ts title="quartz/path.ts"
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```
````

```ts title="quartz/path.ts"
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```

### 指定高亮行（Line Highlighting）

在代码块声明后面使用 `{}` 传入行号或行范围：

````markdown
```ts {2-3,6}
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```
````

```ts {2-3,6}
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```

### 关键字词高亮（Word Highlighting）

使用 `/匹配词/` 语法对代码块中的特定关键字进行高亮标注：

````markdown
```js /useState/
const [age, setAge] = useState(50)
const [name, setName] = useState("Taylor")
```
````

```js /useState/
const [age, setAge] = useState(50)
const [name, setName] = useState("Taylor")
```

### 行内代码着色（Inline Highlighting）

在行内代码反引号后追加 `{:语言}`，即可使其享有对应编程语言的语法着色：

```markdown
这是一个由 1 到 3 组成的数组：`[1, 2, 3]{:js}`。
```

这是一个由 1 到 3 组成的数组：`[1, 2, 3]{:js}`。

### 自定义起始行号（Line Numbers）

语法高亮已默认集成了行号。如果你希望从特定的数字开始计数，可以使用 `showLineNumbers{起始行号}`：

````markdown
```ts showLineNumbers{20}
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```
````

```ts showLineNumbers{20}
export function trimPathSuffix(fp: string): string {
  fp = clientSideSlug(fp)
  let [cleanPath, anchor] = fp.split("#", 2)
  anchor = anchor === undefined ? "" : "#" + anchor

  return cleanPath + anchor
}
```

### 代码块嵌套转义（Escaping Code Blocks）

如需在文档中展示带有反引号代码块的示例，只需在外部包裹层级使用比内部多一个反引号的标记栅栏（例如四个反引号 ` ```` ` 包裹三个反引号 ` ``` `）。

## 自定义与配置

代码语法高亮功能由 [[SyntaxHighlighting]] 插件提供，支持切换各种 VS Code 亮色与暗色主题。详见该插件专属文档。
