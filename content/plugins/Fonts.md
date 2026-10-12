---
title: Fonts
description: "精细控制全站字体排版，支持按标题级别独立设置，并深度集成 Google Fonts。"
tags:
  - plugin/transformer
  - plugin/emitter
image:
repository: "[quartz-community/fonts](https://github.com/quartz-community/fonts)"
enabled: true
required: false
---

该插件为你的 Quartz 站点提供对字体排版的精细化控制。它支持按不同标题级别（h1–h6）独立指定字体族、在使用 [Quartz Themes](https://github.com/saberzero1/quartz-themes) 时自动发现主题字体、无缝集成 Google Fonts 并在需要时自动按需加载字重和斜体，同时优雅回退至 Obsidian 默认的系统字体栈。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 为什么需要 Fonts 插件？

Quartz 默认使用三个全局 CSS 变量管理字体：`--headerFont`、`--bodyFont` 和 `--codeFont`。而 Obsidian 主题生态采用了一套更细化的变量体系（针对各级标题的 `--h1-font` 到 `--h6-font`，以及 `--font-text`、`--font-monospace`）。这两套系统默认无法正确桥接，导致在套用某些 Obsidian 主题时标题字体无法如预期般呈现。

Fonts 插件完美解决了这一断层：

1. 桥接并打通 Obsidian 与 Quartz 的字体变量系统；
2. 输出无分层（unlayered）的高优先级 CSS，正确覆盖 Quartz 的基础标题样式；
3. 提供按标题级别（h1 到 h6）独立精细控制字体的能力；
4. 深度整合 Google Fonts，支持精细化的字重（Weights）与斜体控制。

## 配置选项

字体配置项既支持简单的 CSS 字体族字符串，也支持带有 Google Fonts 细粒度加载控制的对象格式：

```yaml
# 简单字符串格式
body: '"Inter", sans-serif'

# 对象格式（精确控制 Google Fonts 的字重和斜体加载）
body:
  name: Inter
  weights: [400, 600, 700]
  includeItalic: true
```

该插件接受以下配置选项：

| 选项名称 | 数据类型 | 默认值 | 详细说明 |
| --------------- | ------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `title` | `FontSpecification` | `header` 的取值 | 站点主标题所采用的字体族。 |
| `body` | `FontSpecification` | Obsidian 系统默认 | 正文文本所采用的字体族。 |
| `header` | `FontSpecification` | Obsidian 系统默认 | 所有标题（h1 到 h6）的全局默认字体族。 |
| `code` | `FontSpecification` | Obsidian 系统默认 | 代码块与等宽元素所采用的字体族。 |
| `interface` | `FontSpecification` | Obsidian 系统默认 | UI 界面控件元素所采用的字体族。 |
| `h1` – `h6` | `FontSpecification` | `header` 的取值 | 分别针对 h1 到 h6 各级标题的独立覆盖字体族。 |
| `useThemeFonts` | `boolean` | `true` | 当安装了 [Quartz Themes](https://github.com/saberzero1/quartz-themes) 时，是否优先自动使用其字体元数据。 |
| `fontOrigin` | `string` | `"googleFonts"` | 字体加载来源：`"googleFonts"`（从 Google CDN 加载）、`"selfHosted"`（构建时自动下载并在本地自托管）、`"local"`（纯本地现有字体，不发起任何加载）。 |

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/fonts
  enabled: true
  options:
    useThemeFonts: true
    fontOrigin: googleFonts
```

### 字体解析优先级

字体按照以下链路依次降级回退：

```
用户在插件 options 中的显式配置
  → 主题预设字体（来自 Quartz Themes，若已安装）
    → Obsidian 默认系统字体栈
```

对于特定级别标题：

```
h1 专属选项 → header 通用选项 → 主题 --h1-font → 主题字体 → Obsidian 默认
```

## 与 Quartz Themes 搭配使用

当安装并启用了 [Quartz Themes](https://github.com/saberzero1/quartz-themes) 时，Fonts 会自动读取该主题中的字体配置作为默认基准。你在 Fonts 选项中显式填写的任何参数均会覆盖主题预设。

Fonts 必须在 Quartz Themes **之后**执行。插件执行顺序已自动编排（Quartz Themes = 10，Fonts = 60）。

## 实用配置示例

```yaml title="quartz.config.yaml"
# 自动使用主题字体（默认推荐行为）
- source: github:quartz-community/fonts
  enabled: true

# 仅覆盖所有大标题字体
- source: github:quartz-community/fonts
  enabled: true
  options:
    header: '"Playfair Display", serif'

# 完整精细化控制各级标题
- source: github:quartz-community/fonts
  enabled: true
  options:
    body: '"Inter", sans-serif'
    header: '"Playfair Display", serif'
    code: '"JetBrains Mono", monospace'
    h1: '"Playfair Display", serif'
    h2: '"Lora", serif'

# 从 Google Fonts 自动按需拉取指定字体
- source: github:quartz-community/fonts
  enabled: true
  options:
    fontOrigin: googleFonts
    body: Inter
    header: Playfair Display
    code: JetBrains Mono

# 带有字重和斜体控制的 Google Fonts
- source: github:quartz-community/fonts
  enabled: true
  options:
    fontOrigin: googleFonts
    body:
      name: Inter
      weights: [400, 600, 700]
      includeItalic: true
    header:
      name: Playfair Display
      weights: [400, 700]
    code:
      name: JetBrains Mono
      weights: [400]

# 本地自托管字体（构建时下载到本地，运行时绝不产生外部网络请求）
- source: github:quartz-community/fonts
  enabled: true
  options:
    fontOrigin: selfHosted
    body: Inter
    header: Playfair Display
    code: JetBrains Mono
```

## 本地自托管字体（Self-Hosted Fonts）

当配置 `fontOrigin: selfHosted` 时，Fonts 会在本地构建过程中自动从 Google Fonts 下载对应字体的 `.woff2` 文件并写入产物包的 `static/fonts/` 目录中。这使得你的网站完全自给自足，在用户访问时无需向 Google 服务器发起任何外部请求。

> [!note]
> 自托管字体需要在 Quartz 配置中设置 `baseUrl`，因为生成的 CSS 需要使用绝对路径来引用本地字体。

## API

- 类别：转换器（Transformer）、发射器（Emitter）
- 函数名：`ExternalPlugin.Fonts()`（转换器）、`ExternalPlugin.FontsEmitter()`（发射器）
- 源码：[`quartz-community/fonts`](https://github.com/quartz-community/fonts)
- 安装：`npx quartz plugin add github:quartz-community/fonts`
