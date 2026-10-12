---
title: 评论系统
tags:
  - component
---

Quartz 支持对接第三方评论系统，方便读者在你的数字花园中留下思考与评论互动。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

![[giscus-example.png]]

目前官方开箱即用支持 [Giscus](https://giscus.app/)（基于 GitHub Discussions），同时也欢迎社区提交针对其他评论系统的扩展 PR！

## 评论提供商配置

### Giscus（基于 GitHub Discussions）

首先，确保你的 Quartz 托管所在的 GitHub 仓库满足以下条件：

1. **仓库为[公开仓库（Public）](https://docs.github.com/en/github/administering-a-repository/managing-repository-settings/setting-repository-visibility#making-a-repository-public)**，否则访客将无法查看讨论；
2. **已安装 [giscus 应用](https://github.com/apps/giscus)**，赋予其发表评论的权限；
3. **已开启 Discussions 讨论区功能**（在仓库的 Settings → Features 中勾选 Discussions）。

然后，前往 [Giscus 官方配置页面](https://giscus.app/#repository) 获取你的 `repoId` 和 `categoryId`。请确保讨论分类选择 `Announcements`。

![[giscus-repo.png]]

![[giscus-discussion.png]]

输入仓库名并选定分类后，Giscus 会自动计算出一组 ID 参数。你无需手动复制代码，Quartz 会自动处理脚本加载，只需在下一步将这些值填入配置中：

![[giscus-results.png]]

最后，在 `quartz.config.yaml` 中添加 comments 插件并填入你的参数：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/comments
    enabled: true
    options:
      provider: giscus
      options:
        repo: 你的用户名/你的仓库名
        repoId: MDEwOlJlcG9zaXRvcnkzODcyMTMyMDg
        category: Announcements
        categoryId: DIC_kwDOFxRnmM4B-Xg6
        lang: zh-CN # 界面语言设为中文
    layout:
      position: afterBody
      priority: 10
```

如果采用 TS 代码覆盖方式：

```ts title="quartz.ts (覆盖配置)"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

const config = await loadQuartzConfig()
export default config
export const layout = await loadQuartzLayout({
  defaults: {
    afterBody: [
      ExternalPlugin.Comments({
        provider: "giscus",
        options: {
          repo: "你的用户名/你的仓库名",
          repoId: "MDEwOlJlcG9zaXRvcnkzODcyMTMyMDg",
          category: "Announcements",
          categoryId: "DIC_kwDOFxRnmM4B-Xg6",
          lang: "zh-CN",
        },
      }),
    ],
  },
})
```

> [!note] 提示
> 如果未安装评论插件，请先执行：`npx quartz plugin add github:quartz-community/comments`

### 自定义选项

Quartz 完整暴露了 Giscus 的所有高级配置项：

```ts
type Options = {
  provider: "giscus"
  options: {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string

    // 自定义主题 CSS 目录的 URL（默认为 'https://${cfg.baseUrl}/static/giscus'）
    themeUrl?: string

    // 浅色模式 CSS 文件名（默认为 'light'）
    lightTheme?: string

    // 深色模式 CSS 文件名（默认为 'dark'）
    darkTheme?: string

    // 页面与讨论串的映射规则（默认为 'url'）
    mapping?: "url" | "title" | "og:title" | "specific" | "number" | "pathname"

    // 是否启用严格标题匹配（默认为 true）
    strict?: boolean

    // 是否允许主帖表情反应 Reaction（默认为 true）
    reactionsEnabled?: boolean

    // 输入框放置位置（'top' 顶部 或 'bottom' 底部，默认 'bottom'）
    inputPosition?: "top" | "bottom"

    // 界面语言（默认为 'zh-CN' 或 'en'）
    lang?: string
  }
}
```

#### 自定义 Giscus 主题样式

Quartz 支持为 Giscus 注入自定义样式。你可以将自定义 `.css` 文件放入 `quartz/static` 目录中，并在配置中指定路径。

例如，如果你有 `light-theme.css` 和 `dark-theme.css`：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/comments
    enabled: true
    options:
      provider: giscus
      options:
        themeUrl: "https://mysite.github.io/static/giscus"
        lightTheme: light-theme
        darkTheme: dark-theme
```

#### 在特定页面单独关闭评论

Quartz 支持在页面的 Frontmatter 元数据中通过 `comments` 字段单独控制是否开启评论。默认全站开启，如果想在某一特定页面禁用评论，只需设置：

```markdown
---
title: 该页面不开启评论
comments: false
---
```
