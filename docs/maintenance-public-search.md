# 维护验证：`/search` 公开筛选与作者断链检查

本文记录两个可合并为一个垂直功能切片的本地维护入口：

1. 读者公开 `/search` 页面：读者在公开搜索结果里按标签 / 文件夹组合筛选。
2. 作者本地断链检查：构建前发现失效页面链接、失效本地资源、失效标题锚点和重复 slug。

不包含：公开日期筛选、公开草稿 / 未列出筛选、向量检索、相关内容推荐、完整内容管理平台，也未删除任何现有 search / graph / explorer。

---

## 1. `/search` 的入口

读者入口只有一个逻辑路由：`/search`。

- 构建后产物：`public/search.html`（由内置 `PublicSearchPageType` 生成）。
- 索引文件：`public/static/publicSearchIndex.json`（由内置 `PublicSearchIndex` 生成器写出，**只含已发布页面**）。
- 行为（可从任意页面点击搜索入口到达）：

| URL 参数 | 含义 |
| --- | --- |
| `q=<query>` | 查询词，可为空；按标签 / 文件夹筛选时也为空 |
| `tag=<tag>` | 可重复（AND），忽略大小写和首尾空白、URL 编码 |
| `folder=<folder>` | 规范化文件夹路径，匹配该文件夹及其子目录 |
| 参数缺失 | 显示初始状态，不自动渲染全站全部页面 |

- 状态：初始状态、查询中、正常结果、筛选后无结果、索引缺失 / 加载失败。
- 稳定排序：先按相关性，再按规范化 slug 升序；同一输入重复运行顺序一致。
- 不会出现在 `/search` 或公开 `contentIndex` 的页面：

  - `draft: true`（被 `remove-draft` 过滤）
  - `unlisted: true`（被 `unlisted-pages` 排除）
  - 位于 `ignorePatterns`（如 `private`、`templates`）或由发布插件过滤的页面
  - 公开 Content Index（`static/contentIndex.json`）也会排除草稿 / 未列出页面

- `publish` 字段未启用 `explicit-publish`，公开检查不解释 `publish: false`。

### 复现命令

```bash
# 构建后打开 /search（示例：站点运行在 8080 端口，basePath 前缀为 /arkdocs）
# 浏览器中访问：
#   http://localhost:8080/arkdocs/search
# 带筛选的 URL：
#   /arkdocs/search?q=全文&tag=component&folder=features
#   /arkdocs/search?tag=搜索
#   /arkdocs/search?folder=features
```

---

## 2. 测试入口

| 命令 | 作用 |
| --- | --- |
| `npm run test:content-discovery` | 运行离线公开搜索筛选测试（逻辑 + 真实构建路由集成） |
| `npm run test:content-quality` | 运行作者断链检查的 CLI 端到端测试 |
| `npm test` | 仓库内置测试（`tsx --test`） |

测试 fixtures：

- `fixtures/content-discovery/`：中文 / 中英混合 / 数字连字符、不同文件夹、草稿、未列出、私有 / 模板目录、两个同相关性页面。
- `fixtures/content-quality/`：坏样本（断页面链接、断资源、断锚点、跨平台重复 slug、缺 Frontmatter、坏 YAML、缺 title）与同目录 `good/` 合法样本。
- `fixtures/content-quality-valid/`：不含任何 error 的合法 fixture，用于验证退出码 0。
- `fixtures/content-quality-warnings/`：仅含 warning（`frontmatter-field-type`、`unsupported-syntax`），用于验证不阻断构建。

---

## 3. 作者断链检查 CLI

| 命令 | 作用 |
| --- | --- |
| `npm run check:content` | 扫描仓库 `content/`，输出简洁中文摘要（stderr） |
| `npm run check:content -- --root <dir>` | 扫描独立内容目录 |
| `npm run check:content -- --format json` | JSON 报告写到 stdout |
| `npm run check:content -- --format json --output <file>` | 相同 JSON 写到文件（父目录自动创建），摘要写到 stderr；stdout 为空 |

退出码：

| 退出码 | 含义 |
| --- | --- |
| `0` | 无 error（可以只有 warning） |
| `1` | 存在至少一个 error |
| `2` | 参数错误（缺少参数值、未知参数、`--output` 未配合 `--format json`、`--format` 非法、扫描根不存在或不是目录） |

规则与固定严重级别（JSON 的 `ruleId` 字段）：

| ruleId | level | 说明 |
| --- | --- | --- |
| `page-link-missing` | error | Wikilink / Markdown 链接指向不存在的页面 |
| `asset-missing` | error | 本地图片 / 媒体资源（png/jpg/gif/svg/webp/mp3/mp4/pdf 等）不存在 |
| `heading-missing` | error | `[[页面#标题]]` 的标题锚点在目标页面上不存在 |
| `duplicate-slug` | error | 多个源文件生成相同 slug（含跨平台 `duplicate.md` 与 `duplicate/index.md`） |
| `frontmatter-missing` | error | 缺少有效 YAML Frontmatter |
| `frontmatter-parse-failed` | error | YAML 块解析失败 |
| `title-missing` | error | Frontmatter 缺少非空 `title` |
| `frontmatter-field-type` | warning | `tags` 非数组 / `draft` / `publish` / `unlisted` 非布尔 |
| `unsupported-syntax` | warning | 无法静态判定的 Markdown 结构（如未闭合代码围栏） |

被忽略：外部 URL、代码块（围栏 / 行内）、明确示例占位符（`Page`、`TODO`、`link`、中文“页面/链接”）。

JSON 报告结构：

```jsonc
{
  "schemaVersion": 1,
  "scanRoot": "<POSIX 相对路径>",
  "stats": {
    "documents": 111,
    "slugs": 111,
    "assets": 16,
    "links": 357,
    "errors": 0,
    "warnings": 0
  },
  "summary": { "errors": 0, "warnings": 0 },
  "issues": [
    {
      "ruleId": "page-link-missing",
      "level": "error",
      "file": "plugins/index.md",   // 相对扫描根的 POSIX 路径
      "line": 28,                    // 1 行号，可映射回源文件
      "target": "configuration#插件", // 原始目标（可能含锚点）
      "message": "Wikilink 指向不存在的页面 …"
    }
  ]
}
```

排序稳定：`ruleId → file → line（缺省行号视为最大）→ target`，同一输入重复运行 JSON 内容字节一致。

### 报告位置

CLI 默认输出到 stdout / stderr，不落盘。若需要发布报告：

```bash
npm run check:content -- --root <dir> --format json --output reports/content-quality.json
```

GitHub Actions CI 在构建前运行 `npm run check:content`（扫描 `content/`），并在 `continue-on-error` 的步骤中执行
`npm run check:content -- --root fixtures/content-quality --format json --output reports/content-quality.json`，
作为 fixture 演示；真实 `content/` 不出现 error（退出码 0）。

### 已知限制

- 标题锚点检查对 Obsidian 简写 / 部分小节引用做了前缀 / 包含匹配（如“高级源选项”对应“高级源路径配置…”），以避免对真实文档误报；这可能放行极个别真正失效的简写锚点。
- `.canvas` / `.base` 转置目标不作为普通媒体检查（它们由 Quartz 作为静态资源复制）。
- 检查不依赖网络、API Key、数据库或运行时服务；纯离线、纯 Node（ESM，无 TS 编译依赖）。
