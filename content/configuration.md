---
title: 配置
---

即使你不会编程，Quartz 也应当非常容易配置。大多数配置只需编辑 `quartz.config.yaml`。

> [!tip] 提示
> 如果你使用带 YAML 语言支持的编辑器（例如 VSCode）编辑 `quartz.config.yaml`，配置出错时会收到语法提示与自动校验，有助于避免配置错误。

Quartz 的配置主要分为两个部分：

```yaml title="quartz.config.yaml"
configuration:
  pageTitle: "我的站点"
  # ... 全局通用配置
plugins:
  - source: github:quartz-community/some-plugin
    enabled: true
    # ... 插件列表项
```

## 通用配置

这部分配置会影响整个站点。下面列出所有可配置的字段：

- `pageTitle`：站点的全局标题。在为站点生成 [[RSS Feed|RSS 订阅源]] 时也会使用该标题。
- `pageTitleSuffix`：追加在页面标题末尾的后缀字符串。该后缀仅应用于浏览器标签页的网页标题，不影响页面正文顶部展示的大标题。
- `enableSPA`：是否在站点上开启 [[SPA Routing|SPA 单页无刷新路由]]。
- `enablePopovers`：是否开启链接悬浮时的 [[popover previews|悬浮卡片预览]]。
- `analytics`：站点访问数据统计分析提供商。可选值包括：
  - `null`：不启用统计；
  - `{ provider: 'google', tagId: '<你的-google-tag>' }`：使用 Google Analytics；
  - `{ provider: 'plausible' }`（云托管版）或 `{ provider: 'plausible', host: 'https://<你的-plausible-域名>' }`（自建版，请务必包含 `https://` 协议前缀）：使用 [Plausible](https://plausible.io/)；
  - `{ provider: 'umami', host: '<你的-umami-域名>', websiteId: '<你的-umami-website-id>' }`：使用 [Umami](https://umami.is/)；
  - `{ provider: 'goatcounter', websiteId: 'my-goatcounter-id' }`（云托管版）或 `{ provider: 'goatcounter', websiteId: 'my-goatcounter-id', host: 'my-goatcounter-domain.com', scriptSrc: 'https://my-url.to/counter.js' }`（自建版）：使用 [GoatCounter](https://goatcounter.com)；
  - `{ provider: 'posthog', apiKey: '<你的-posthog-项目-apiKey>', host: '<你的-posthog-域名>' }`：使用 [Posthog](https://posthog.com/)；
  - `{ provider: 'tinylytics', siteId: '<你的-site-id>' }`：使用 [Tinylytics](https://tinylytics.app/)；
  - `{ provider: 'cabin' }` 或 `{ provider: 'cabin', host: 'https://cabin.example.com' }`（自定义域名）：使用 [Cabin](https://withcabin.com)；
  - `{ provider: 'clarity', projectId: '<你的-clarity-id-code>' }`：使用 [Microsoft Clarity](https://clarity.microsoft.com/)；
  - `{ provider: 'matomo', siteId: '<你的-matomo-id-code>', host: 'matomo.example.com' }`：使用 [Matomo](https://matomo.org/)（域名不带协议）；
  - `{ provider: 'vercel' }`：使用 [Vercel Web Analytics](https://vercel.com/docs/concepts/analytics)；
  - `{ provider: 'rybbit', siteId: 'my-rybbit-id' }`（云托管版）或 `{ provider: 'rybbit', siteId: 'my-rybbit-id', host: 'my-rybbit-domain.com' }`（自建版）：使用 [Rybbit](https://rybbit.com)；
- `locale`：站点语言区域，用于 [[i18n|国际化界面文本]] 和本地化日期格式化；
- `baseUrl`：站点的规范基准 URL。Sitemap 站点地图与 RSS 订阅源需要以此生成绝对路径，以知晓站点的规范主页位置。通常是站点的线上部署域名（例如本站为 `mysite.github.io/arkdocs`）。**切勿包含 `https://` 协议前缀或任何开头与末尾的斜杠**。
  - 在执行 [[create|`npx quartz create`]] 初始化时会提示你设置。CLI 会自动为你剔除 `https://` 或 `http://` 协议前缀以及首尾斜杠。
  - 如果你在 GitHub Pages 上[[hosting|托管部署]]且没有绑定自定义独立域名，则必须包含子路径。例如仓库是 `jackyzha0/quartz`，GitHub Pages 部署地址为 `https://jackyzha0.github.io/quartz`，此时 `baseUrl` 填 `jackyzha0.github.io/quartz`。
  - Quartz 5 会在内部尽量避免依赖该绝对路径，尽可能全部使用相对 URL，确保无论你的网站被部署到何处都能正常展示。
- `ignorePatterns`：忽略模式列表（[glob](<https://en.wikipedia.org/wiki/Glob_(programming)>) 表达式）。Quartz 在扫描 `content` 文件夹时会自动跳过匹配这些模式的文件。详见 [[private pages|私有页面与草稿]]。
- `theme`：主题外观视觉配置：
  - `fontOrigin`：字体加载来源。
    - `"googleFonts"`（默认值）：从 Google Fonts API 加载字体。加载最快，尤其是在启用 CDN 缓存时。
    - `"local"`：在构建时自动下载字体文件并随你的网站本地托管。完全自包含，无任何外部网络请求。
  - `cdnCaching`：若为 `true`（默认值），使用 Google CDN 缓存字体，速度通常更快。若希望 Quartz 本地离线完全自给自足，可设为 `false`。
  - `typography`：字体排版定义。任何在 [Google Fonts](https://fonts.google.com/) 上的字体均可在此直接指定：
    - `title`：站点标题的专属字体（可选，默认与 `header` 一致）；
    - `header`：各级标题所用字体；
    - `code`：行内代码与代码块所用等宽字体；
    - `body`：正文默认字体；
  - `colors`：主题颜色与调色板定义（分为 `lightMode` 亮色模式与 `darkMode` 暗色模式）：
    - `light`：页面背景底色；
    - `lightgray`：边框与浅色分界线颜色；
    - `gray`：图谱连线、次级边框颜色；
    - `darkgray`：正文文本颜色；
    - `dark`：大标题文字与主要图标颜色；
    - `secondary`：超链接颜色、当前选中的[[graph view|图谱节点]]高亮色；
    - `tertiary`：链接悬浮态、已访问过的[[graph view|图谱节点]]颜色；
    - `highlight`：内部链接底色背景、文本高亮、[[syntax highlighting|代码高亮行背景]]；
    - `textHighlight`：Markdown 标记高亮文本的底色。

## 插件体系（Plugins）

你可以将 Quartz 的插件体系理解为一系列对内容进行的流水线转换处理：

![[quartz transform pipeline.png]]

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/created-modified-date
    enabled: true
    order: 10 # 控制执行优先级顺序
  - source: github:quartz-community/syntax-highlighting
    enabled: true
    order: 20
  # ... 更多插件
```

插件在其 Manifest 清单中声明了自身类型（Transformer 转换器、Filter 过滤器、Emitter 发射器、PageType 页面类型）。`order` 字段用于控制同类型插件内部的执行次序。

> [!note] 代码级 TS 覆盖
> 如需通过 TypeScript 对插件配置进行高级代码级覆盖，可以直接修改 `quartz.ts`：
>
> ```ts title="quartz.ts"
> import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
>
> const config = await loadQuartzConfig({
>   // 在此覆盖任何所需配置字段
> })
> export default config
> export const layout = await loadQuartzLayout()
> ```

- [[tags/plugin/transformer|转换器（Transformers）]]：对内容进行**映射加工**（例如解析 Frontmatter 元数据、生成文章摘要描述）。
- [[tags/plugin/filter|过滤器（Filters）]]：对内容进行**条件筛选**（例如过滤掉草稿页面）。
- [[tags/plugin/emitter|发射器（Emitters）]]：对所有内容进行**归约汇总并输出**（例如生成 RSS 订阅源、生成列出某标签全部文章的归档页）。
- **页面类型（Page Types）**：定义不同类型页面的渲染逻辑（内容页、目录列表页、标签列表页）。每种页面类型可以使用不同的[[layout#页面框架（Page Frames）|页面框架]]来控制其顶层 HTML 骨架。

`quartz.config.yaml` 中的 `layout.byPageType` 部分还可以配置 `template` 字段，显式指定特定页面类型所使用的页面框架：

```yaml title="quartz.config.yaml"
layout:
  byPageType:
    canvas:
      template: minimal # 让白板页面使用极简无边栏框架
```

详见 [[layout#页面框架（Page Frames）]] 了解可用框架和解析机制。

### 内置插件与社区插件

Quartz 区分随核心自带的内部插件（Internal Plugins）和独立安装的社区插件（Community Plugins）。

在 `quartz.config.yaml` 中，社区插件通过其 GitHub 来源进行声明：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/explorer
    enabled: true
  - source: github:quartz-community/syntax-highlighting
    enabled: true
    options:
      theme:
        light: github-light
        dark: github-dark
```

内部插件（如 `FrontMatter`）直接打包随 Quartz 内置。社区插件由用户独立安装，并通过 `github:组织名/仓库名` 来源引用。

### 社区插件管理

安装社区插件可以使用以下命令：

```shell
npx quartz plugin add github:quartz-community/explorer
```

该命令会自动将插件记录写入 `quartz.config.yaml`，并将其下载安装到 `.quartz/plugins/` 目录中。

安装配置文件中引用但本地尚未安装的所有插件（在刚克隆项目或配置 CI 流水线时特别有用）：

```shell
npx quartz plugin install --from-config
```

清理并移除本地已安装但配置中不再引用的插件：

```shell
npx quartz plugin prune
```

这两个命令均支持 `--dry-run` 选项以预览将要进行的改动。详细用法参见 [[cli/plugin|插件命令行参考]]。

### 高级源路径配置（Advanced Source Options）

插件的 `source` 字段不仅可以是一个简单的 GitHub 标识字符串，也可以是一个对象，以提供更细致的来源控制。普通字符串形式最为常用：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/explorer
    enabled: true
```

对于位于仓库子目录中的插件（Monorepo 结构），或者需要锁定到特定分支或 Git Tag 时，可以使用对象形式：

```yaml title="quartz.config.yaml"
plugins:
  - source:
      repo: "https://github.com/user/repo.git"
      subdir: plugin
      ref: main
      name: my-plugin
    enabled: true
```

对象形式支持以下字段：

| 字段 | 必填 | 说明 |
| -------- | :------: | --------------------------------------------------------------------------------------------------------- |
| `repo` | ✅ | Git 仓库 URL（例如 `https://github.com/user/repo.git`）。 |
| `subdir` | ❌ | 仓库中包含插件的子目录。适用于 Monorepo 单仓多包结构的插件仓库。 |
| `ref` | ❌ | 锁定的 Git Ref（分支名称或 Tag 标签）。等价于字符串形式后面的 `#ref` 后缀。 |
| `name` | ❌ | 覆盖在 `.quartz/plugins/` 中使用的本地文件夹名称。默认取仓库名称。 |

> [!example] 实际示例
> [quartz-themes](https://github.com/saberzero1/quartz-themes) 插件位于其代码仓库的 `plugin/` 子目录中。安装配置如下：
>
> ```yaml title="quartz.config.yaml"
> plugins:
>   - source:
>       name: quartz-themes
>       repo: "https://github.com/saberzero1/quartz-themes.git"
>       subdir: plugin
>     enabled: true
>     options:
>       theme: "tokyo-night"
>       mode: both
> ```

> [!tip] 提示
> 字符串格式 `github:user/repo#branch` 与对象格式 `{ repo, ref }` 是等价的分支指定方式。当还需要指定 `subdir` 或 `name`，或者追求更具可读性的配置格式时，推荐使用对象格式。

### 插件用法与选项配置

你可以通过在 `quartz.config.yaml` 中添加、删除和调整插件顺序来自定义 Quartz 的行为。每个插件项指定其来源、是否启用、执行顺序以及个性化配置选项：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/note-properties
    enabled: true
    options:
      includeAll: false
      includedProperties:
        - description
        - tags
        - aliases
    order: 5
  - source: github:quartz-community/created-modified-date
    enabled: true
    options:
      priority:
        - frontmatter
        - git
        - filesystem
    order: 10
  - source: github:quartz-community/latex
    enabled: true
    options:
      renderEngine: katex
    order: 80
```

> [!note] 针对函数的 TS 回调覆盖
> 部分插件选项需要传入 JavaScript 回调函数（例如自定义排序、过滤或映射函数），这些无法在纯 YAML 中表达。对于这类场景，可以在 `quartz.ts` 中使用 TypeScript 覆盖：
>
> ```ts title="quartz.ts"
> import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
> import * as ExternalPlugin from "./.quartz/plugins"
>
> ExternalPlugin.Explorer({
>   mapFn: (node) => {
>     node.displayName = node.displayName.toUpperCase()
>     return node
>   },
> })
>
> const config = await loadQuartzConfig()
> export default config
> export const layout = await loadQuartzLayout()
> ```
>
> 在 `quartz.ts` 中设置的选项会与 YAML 选项深度合并并拥有更高优先级。插件覆盖代码必须置于 `loadQuartzConfig()` **之前**，以便在加载配置实例化组件时即时生效。具体可用回调选项请参阅各插件专属文档。

你可以在[[tags/plugin|插件列表索引]]中查看所有插件及其支持的配置选项。

如果你想动手开发专属插件，请阅读[[making plugins|制作自定义插件]]指南。

## 字体排版（Fonts）

字体既可以直接指定为简单字符串，也可以在 `quartz.config.yaml` 中配合高阶选项配置：

```yaml title="quartz.config.yaml"
configuration:
  theme:
    typography:
      title: Schibsted Grotesk # 可选，默认使用 header 字体
      header: Schibsted Grotesk
      body: Source Sans Pro
      code: IBM Plex Mono
```

如需对字重（Font Weights）和斜体（Italics）进行更加精确的控制，可以在 `quartz.ts` 中使用 TS 代码覆盖：

```ts title="quartz.ts"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

const config = await loadQuartzConfig({
  theme: {
    typography: {
      header: {
        name: "Schibsted Grotesk",
        weights: [400, 700],
        includeItalic: true,
      },
      body: "Source Sans Pro",
      code: "IBM Plex Mono",
    },
  },
})
export default config
export const layout = await loadQuartzLayout()
```
