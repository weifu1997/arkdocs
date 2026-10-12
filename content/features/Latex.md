---
title: LaTeX 数学公式
tags:
  - feature/transformer
---

Quartz 默认使用高性能排版引擎 [KaTeX](https://katex.org/)，在构建阶段静态渲染行内数学公式与独立块级数学公式。

## 语法

### 块级独立公式（Block Math）

使用两对美元符号 `$$` 包裹数学公式表达式即可渲染为居中的独立公式块：

```markdown
$$
f(x) = \int_{-\infty}^\infty
    f\hat(\xi)\,e^{2 \pi i \xi x}
    \,d\xi
$$
```

$$
f(x) = \int_{-\infty}^\infty
    f\hat(\xi)\,e^{2 \pi i \xi x}
    \,d\xi
$$

多行对齐方程组：

$$
\begin{aligned}
a &= b + c \\ &= e + f \\
\end{aligned}
$$

矩阵排版：

$$
\begin{bmatrix}
1 & 2 & 3 \\
a & b & c
\end{bmatrix}
$$

推导步骤排版：

$$
\begin{array}{rll}
E \psi &= H\psi & \text{展开哈密顿算符} \\
&= -\frac{\hbar^2}{2m}\frac{\partial^2}{\partial x^2} \psi + \frac{1}{2}m\omega x^2 \psi & \text{采用设解试探} \\
\end{array}
$$

> [!warning] 格式提示
> 受限于[底层 Markdown 数学公式解析器](https://github.com/remarkjs/remark-math)的规范要求，块级公式的开头 `$$` 与结尾 `$$` 定界符必须**单独成行**。

### 行内公式（Inline Math）

行内公式使用单个美元符号 `$` 包裹。例如：`$e^{i\pi} = -1$` 会渲染为 $e^{i\pi} = -1$。

### 美元符号转义（Escaping Symbols）

当段落中出现美元货币符号时，可能意外误触发 KaTeX 公式解析。

为了避免歧义，可使用反斜杠对其进行转义：`\$`。

例如：
- 错误写法：`I have $1 and you have $2` 会错误渲染为：I have $1 and you have $2
- 正确写法：`I have \$1 and you have \$2` 会正确渲染为：I have \$1 and you have \$2

### 支持化学方程式扩展（mhchem）

如果需要渲染化学方程式，可在 KaTeX 插件的引入入口中加入 `mhchem` 扩展：

```ts title="src/index.ts"
import "katex/contrib/mhchem"
```

## 自定义与配置

LaTeX 公式解析由 [[plugins/Latex|Latex]] 插件提供，支持切换 KaTeX 或 MathJax 渲染引擎。详情请参见该插件页面。
