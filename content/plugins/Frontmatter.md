---
title: Frontmatter
aliases:
  - note-properties
  - Note Properties
description: "解析页面 Frontmatter 元数据，并在正文前以可折叠面板展示属性列表。"
tags:
  - plugin/transformer
  - plugin/component
publish: true
enableToc: true
image:
repository: "[quartz-community/note-properties](https://github.com/quartz-community/note-properties)"
enabled: true
required: true
---

该插件借助 [gray-matter](https://github.com/jonschlinkert/gray-matter) 库解析文档开头的 Frontmatter 元数据，并支持将指定属性在正文前以优雅的可折叠面板展现。详情请参阅 [[authoring content#语法|撰写内容]]、[[features/Obsidian compatibility|Obsidian 兼容特性]] 以及 [[features/OxHugo compatibility|OxHugo 兼容特性]]。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

> [!warning] 核心必需提醒
> **切勿移除**该插件，否则 Quartz 的全站元数据解析流水线将无法正常工作。

## 配置选项

该插件接受以下配置选项：

- `delimiters`：Frontmatter 的定界符。可传单个字符串（如 `"---"`）或分别指定开头与结尾定界符的数组（如 `["---", "~~~"]`）。默认为 `"---"`。
- `language`：解析 Frontmatter 使用的标记语言。支持 `yaml`（默认）或 `toml`。
- `includeAll`：是否在前端属性面板中无保留显示所有 Frontmatter 字段。当为 `false` 时，仅展示 `includedProperties` 中声明的字段。默认为 `false`。
- `includedProperties`：当 `includeAll` 为 `false` 时允许展示的属性名单。默认为 `["description", "tags", "aliases"]`。
- `excludedProperties`：强制从属性面板中始终排除隐藏的字段名单。默认为 `[]`。
- `hidePropertiesView`：在解析 Frontmatter 的同时，完全隐藏前端的视觉属性面板。如果你只需要元数据解析而不需要在页面顶部显示面板，可将其设为 `true`。默认为 `false`。

### 默认配置示例

```yaml title="quartz.config.yaml"
- source: github:quartz-community/note-properties
  enabled: true
  options:
    includeAll: false
    includedProperties:
      - description
      - tags
      - aliases
    excludedProperties: []
    hidePropertiesView: false
    delimiters: "---"
    language: yaml
```

## 笔记属性面板（Properties Panel）

启用后，该插件会在正文内容上方渲染一个类似 Obsidian 属性栏的可折叠“属性（Properties）”面板，以表格形式展示所选字段，并带有智能的类型渲染：

- **字符串（Strings）**：显示为纯文本。其中的 [[wikilinks|双向链接]] 和普通 Markdown 超链接会自动解析为可点击的交互链接。双链匹配不区分大小写，与 Obsidian 逻辑一致；
- **数组（Arrays）**：以逗号或标签药丸形式列出；
- **布尔值（Booleans）**：渲染为美观的只读复选框；
- **数字（Numbers）**：以等宽字体展示；
- **对象（Objects）**：在代码块中以格式化 JSON 呈现；
- **标签（Tags）**：特殊高亮显示为指向对应标签聚合页的交互药丸卡片；
- **空值（Null/undefined）**：显示为破折号（—）。

### 单篇笔记独立覆盖开关

你可以通过在具体笔记的 Frontmatter 中使用特定字段独立控制该面板：

- `quartz-properties`（或 `quartzProperties`）：设为 `true` 强制在当前笔记显示面板，或 `false` 强制隐藏，覆盖全局设置；
- `quartz-properties-collapse`（或 `quartzPropertiesCollapse`）：设为 `true` 使该面板初始状态默认折叠，或 `false` 保持展开。

## 支持的常用 Frontmatter 字段

| 字段名称 | 可用键名（别名） | 详细描述说明 |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 标题 | `title` | 页面大标题。若为空则回退使用当前文件名。 |
| 描述 | `description` | 页面描述摘要，用于 SEO、页面元数据以及站内搜索。 |
| 标签 | `tags`, `tag` | 分类标签数组。会自动做 Slug 规范化，大小写不敏感（例如 `#MyTag` 与 `#mytag` 解析至同一标签页）。 |
| 别名 | `aliases`, `alias` | 替代名称别名列表，供双链解析使用。 |
| 固定链接 | `permalink` | 自定义永久 URL Slug 路径。 |
| CSS 类名 | `cssclasses`, `cssclass` | 附加在当前页面 body 元素上的自定义 CSS 类名。 |
| 社交封面图 | `socialImage`, `image`, `cover` | 在社交网络（Open Graph）分享时使用的预览图片。 |
| 创建日期 | `created`, `date` | 文档最初创建时间。 |
| 最后修改日期 | `modified`, `lastmod`, `updated`, `last-modified` | 文档最后修改时间。未设置时自动回退至创建时间。 |
| 发布日期 | `published`, `publishDate`, `date` | 文档公开正式发布时间。 |
| 是否发布 | `publish` | 该文档是否允许公开上线（与 ExplicitPublish 插件协同）。 |
| 是否为草稿 | `draft` | 是否标记为本地草稿（与 RemoveDrafts 插件协同）。 |
| 开启评论 | `comments` | 是否在当前页面开启评论系统（设为 `false` 可单页禁用）。 |
| 语言区域 | `lang` | 当前文档的语言代码。 |
| 开启目录 | `enableToc` | 是否在当前页面显示目录列表（设为 `false` 可隐藏）。 |

## API

- 类别：转换器（Transformer）、组件（Component）
- 函数名：`ExternalPlugin.NoteProperties()`
- 源码：[`quartz-community/note-properties`](https://github.com/quartz-community/note-properties)
- 安装：`npx quartz plugin add github:quartz-community/note-properties`
