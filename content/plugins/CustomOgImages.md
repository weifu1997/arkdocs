---
title: Custom OG Images
description: "使用 Satori 为每篇笔记动态生成社交媒体 Open Graph 分享预览图。"
tags:
  - feature/emitter
image: "[[social-image-preview-dark.png]]"
repository: "[quartz-community/og-image](https://github.com/quartz-community/og-image)"
enabled: true
required: false
---

Custom OG Images 发射器插件为你的全站页面动态生成社交媒体预览分享图。它使用 [Satori](https://github.com/vercel/satori) 将 HTML/CSS 布局转换为高质量图片，允许你为数字花园内容创建优雅统一的社交分享卡片。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

## 功能特性

- 自动为每个 Markdown 页面动态生成专属社交分享图；
- 完美契合站点的浅色与深色主题；
- 支持在单篇笔记的 Frontmatter 中精细覆盖与定制；
- 具备全局默认图片兜底回退机制；
- 允许通过自定义 Preact 组件对分享图外观结构拥有 100% 的设计控制权。

## 配置

> [!info] 绝对路径提示
> 社交分享图在 HTML 中需要输出绝对 URL 路径，因此请确保在全局 [[configuration|配置]] 中正确指定了 `baseUrl`。

在 `quartz.config.yaml` 中的基础配置：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/og-image
    enabled: true
    options:
      colorScheme: lightMode # "lightMode" 或 "darkMode"
      width: 1200
      height: 630
      excludeRoot: false
```

如果采用 TS 代码覆盖方式（自定义 `imageStructure` 渲染结构时必需）：

```ts title="quartz.ts (覆盖配置)"
import * as ExternalPlugin from "./.quartz/plugins"
import { defaultImage } from "./quartz/plugins/emitters/ogImage"

// 必须放置在 loadQuartzConfig() 之前
ExternalPlugin.CustomOgImages({
  colorScheme: "lightMode",
  width: 1200,
  height: 630,
  excludeRoot: false,
  imageStructure: defaultImage,
})
```

### 配置参数速查

| 选项名称 | 数据类型 | 默认值 | 说明 |
| -------------------- | --------- | ------------------------- | ----------------------------------------------------------------- |
| `colorScheme` | string | `"lightMode"` | 生成分享图所采用的主题色系（`"darkMode"` 或 `"lightMode"`） |
| `width` | number | 1200 | 生成图片的宽度（像素） |
| `height` | number | 630 | 生成图片的高度（像素） |
| `excludeRoot` | boolean | false | 是否从自动生成中排除根目录首页 |
| `defaultTitle` | string | `"Untitled"` | 页面缺少标题时的默认后备标题 |
| `defaultDescription` | string | `"No description provided"` | 页面缺少摘要时的默认后备描述 |
| `imageStructure` | component | defaultImage | 用于生成图片的可视化渲染组件 |

## Frontmatter 属性覆盖

你可以在单篇笔记的 Frontmatter 中通过以下属性单独定制卡片：

| 属性名称 | 可用别名 | 作用说明 |
| ------------------- | ---------------- | ----------------------------------- |
| `socialDescription` | `description` | 专门用于社交卡片展示的描述文本 |
| `socialImage` | `image`, `cover` | 自定义封面图片的链接或路径 |

`socialImage` 既可以填写相对于 `quartz/static` 的本地路径（如 `"my-images/cover.png"`），也可以填写完整的外部绝对 URL（如 `"https://example.com/cover.png"`）。

> [!info] 封面图优先级
> 最终封面图的选取优先级遵循：`Frontmatter 单篇指定 > 动态合成生成的图片 > 全局默认静态图片（quartz/static/og-image.png）`。

## 高级定制（自定义图片组件）

你可以通过向 `imageStructure` 传入自定义组件来完全掌控生成卡片的视觉排版。该组件接收 JSX 结构与页面元数据，借助 [Satori](https://github.com/vercel/satori) 渲染为矢量图片。Vercel 提供了[在线演练场（Playground）](https://og-playground.vercel.app/)，非常适合在此快速原型验证你的设计卡片。

### 字体映射

组件会自动接收包含标题与正文字体的数组。在样式中使用 `fontFamily: fonts[0].name`（标题字体）或 `fonts[1].name`（正文字体）即可应用。

```tsx title="socialImage.tsx"
export const myImage: SocialImageOptions["imageStructure"] = (...) => {
  return <p style={{ fontFamily: fonts[0].name }}>我的炫酷标题！</p>
}
```

## API

- 类别：发射器（Emitter）
- 函数名：`ExternalPlugin.CustomOgImages()`
- 源码：[`quartz-community/og-image`](https://github.com/quartz-community/og-image)
- 安装：`npx quartz plugin add github:quartz-community/og-image`
