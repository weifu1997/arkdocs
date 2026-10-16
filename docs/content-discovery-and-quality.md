# 内容发现与质量检查

本文档记录 ArkDocs 两个垂直功能切片的实际入口、复现命令、规则级别与已知限制，供评测与日常维护使用。

- A. 公开搜索筛选：读者从现有搜索入口进入公开的 `/search` 页面，按标签与文件夹组合筛选 published 页面。
- B. 作者本地断链检查：作者在本地或构建前运行 CLI，发现失效页面链接、失效本地资源、失效标题锚点与重复 slug。

> 两者均不依赖网络、数据库或 Embedding，纯离线运行。

---

## A. 公开搜索筛选

### 入口

- 读者点击站点工具栏上**现有的搜索入口**（搜索按钮，或浏览器中按下 `⌘K` / `Ctrl+K` 打开的浮层）。
  - 普通点击/触摸该按钮 → 逻辑路由 `/search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>`（SPA 导航，保持已有的快捷键、键盘操作与移动端布局）。
  - 浮层仍可通过 `⌘K` 打开（包括在 `/search` 页面上）；在 `/search` 上点击按钮时优先使用页内筛选控件，不会重复导航。
- 构建产物中存在独立页面 `public/search.html`，可直接访问、刷新或分享 URL。

### URL 契约

```
/search?q=<查询词>&tag=<标签>&tag=<标签>&folder=<文件夹>
```

- `q`：查询词，可为空；空查询且无筛选时显示初始提示，**不自动列出全站页面**。
- `tag`：可重复出现，多个标签使用 AND；比较时忽略大小写与首尾空白。
- `folder`：规范化的文件夹路径，使用 URL 解码后的路径（中文、空格均经 `URLSearchParams` 正确编码）；匹配该文件夹及其全部子目录，不匹配同级目录（例如 `folder=features` 不会匹配 `features-other/`）。
- 标签与文件夹筛选同时使用时同样为 AND。
- 刷新、复制 URL 后，结果与筛选状态保持一致。
- 不支持也不会出现 `status=draft` / `status=unlisted` / 日期参数。

### 数据与发布边界

- 浏览器端不重新解析 Markdown，只读取构建阶段生成的公开 `ContentIndex`（`static/contentIndex.json`），其中包含字段：`slug`、`title`、`content`（可搜索纯文本，缺失时使用固定短文本降级）、`tags`、`filePath`。
- 公开索引与 `/search` 页面只包含 **published** 页面，固定边界按 Quartz 现有发布规则：
  - `draft: true` → draft，剔除（`RemoveDrafts`）；
  - `unlisted: true` → unlisted，不进入公开索引/页面、sitemap、RSS；
  - 位于 `quartz.config.yaml` 的 `ignorePatterns` 或被现有发布插件过滤 → private/ignored，不出现；
  - 其余为 published。
- 若当前配置未启用 `explicit-publish`，`publish` 字段不产生额外语义，不自行解释 `publish: false`。
- 排序确定性：先按查询相关性，再以 slug 升序作为最终 tie-break，不依赖文件遍历顺序或修改时间；同一输入重复运行顺序一致。

### 复现命令

```bash
# 离线测试（URL 契约、标签/文件夹 AND、中文/中英混合查询、published 边界、
# 稳定排序、路由/页面集成）
npm run test:content-discovery

# 构建后确认 /search 页面与公开索引边界
npx quartz build -d content
# 产物：public/search.html；public/static/contentIndex.json 中不包含草稿/未列出页
```

- 测试夹具（不修改真实 `content/`）：`fixtures/content-discovery/`，包含中文标题与正文、中英混合/数字/连字符、标签大小写与空白变体、多标签 AND 同标签页、不同文件夹、同相关性两个 tie-break 页面、一个草稿与一个未列出页面。

---

## B. 作者本地断链检查

### 运行入口与命令

```bash
# 默认扫描仓库 content/，输出简洁中文摘要
npm run check:content

# 指定独立内容目录
npm run check:content -- --root <content-dir>

# JSON 报告输出到 stdout（便于其他程序解析）
npm run check:content -- --root <content-dir> --format json

# JSON 报告写入文件（目录不存在时自动创建；摘要写到 stderr）
npm run check:content -- --root <content-dir> --format json --output reports/content-quality.json
```

- 跨平台：Windows / macOS / Linux 使用同一脚本与同一退出码语义；报告路径一律使用 `/` 相对路径，不包含机器专属绝对路径；不使用 `mkdir -p` 等 Unix 专属命令（CLI 自行创建父目录）。
- 不要求网络、API Key、数据库或运行时服务。

### 退出码

- `0`：无 error（warning 不阻断构建）。
- `1`：至少一个 error 规则命中。
- `2`：用法错误：未知参数、必填值缺失、内容目录不存在、或 `--output` 未配合 `--format json`。

### 规则矩阵（fixed severity）

| ruleId | level | 说明 |
| --- | --- | --- |
| `page-link-missing` | error | 页面链接（Wikilink 或 Mardown 相对路径）在 published 页面对象集合中不存在。支持 Wikilink、Mardown 相对路径、URL 编码路径、中文路径与空格路径。 |
| `asset-missing` | error | 本地图片/媒体资源（图片、媒体、canvas/base 等）在源树中不存在。 |
| `heading-missing` | error | 标题锚点按 Quartz 实际 slug 规则（github-slugger）解析后，目标页中没有对应标题。 |
| `duplicate-slug` | error | 多个源文件按同一 slug 规则生成相同 slug（如 `duplicate.md` 与 `duplicate/index.md`），报告全部冲突文件、行号与定位。 |
| `frontmatter-missing` | error | 文件没有 Frontmatter。 |
| `frontmatter-parse-failed` | error | Frontmatter YAML 解析失败。 |
| `title-missing` | error | 缺少非空字符串 `title`。 |
| `frontmatter-field-type` | warning | `tags`（字符串数组）、`draft`、`publish`、`unlisted` 字段类型不安全；报告并保留问题，不被屏蔽。 |
| `unsupported-syntax` | warning | 块引用（`[[^id]]`）等无法静态验证的语法。 |

### 忽略/降级

- 外部 URL、代码块内链接、行内代码、明确的文档示例占位符（如 `` `[[Page]]` ``、`[link]` 示例）不会被报告为断链。
- Quartz 生成的虚拟页：文件夹页（`<folder>/index`）、标签页（`tags/<tag>`）、以及 `/search`、404 虚拟页都可被链接，不会被误报为缺失。
- 草稿/未列出页按现有发布规则处理；公开搜索只看到 published 页面。
- 检查基于 Mardown AST（remark-parse 处理）、现有解析器与 `@quartz-community/utils` 的 slug/链接规则，而不是宽泛正则。

### JSON 报告字段

```json
{
  "schemaVersion": "1",
  "contentRoot": "content",
  "counts": { "documents": 111, "pages": 111, "assets": 12, "links": 379, "errors": 0, "warnings": 0 },
  "issues": [
    {
      "ruleId": "heading-missing",
      "level": "error",
      "file": "path/to/page.md",
      "line": 7,
      "target": "notes/with-anchors#不存在的锚点",
      "message": "标题锚点不存在：...",
      "files": [{ "file": "duplicate/index.md", "line": 1 }]
    }
  ]
}
```

- `issues` 按文件、行号、ruleId、target 稳定排序；同一夹具连续两次运行 JSON 内容完全一致。
- 全局无法映射到源文本的问题允许省略 `line`；其余页面链接、资源、锚点、重复 slug 均带相对源文件与行号/Frontmatter 定位。

### 复现命令与夹具

```bash
# 坏样本夹具（触发全部规则，退出 1）
npm run check:content -- --root fixtures/content-quality --format json --output reports/content-quality.json

# 干净的合法夹具（不产生 error，退出 0）
npm run check:content -- --root fixtures/content-quality-valid

# 离线测试（CLI 退出码、摘要、JSON 可解析性、规则 ID、源文件/行号/目标、排序与确定性）
npm run test:content-quality
```

- 夹具：`fixtures/content-quality/`（含断页面链接、断图片/媒体、断锚点、跨平台重复 slug、中文文件名/空格路径/URL 编码路径、虚拟文件夹页与标签页、草稿/未列出页、缺失 Frontmatter、YAML 解析失败、缺失 title、字段类型错误、代码块/行内代码/外部链接/占位符、不支持语法）。
- 干净夹具：`fixtures/content-quality-valid/`，同一 CLI 退出码为 0。

---

## CI / 发布保障

GitHub Actions 在构建前运行：

```bash
npm run check:content -- --format json --output reports/content-quality.json
```

- 报告以 `content-quality-report-${{ matrix.os }}` 为唯一 artifact 名（OS 矩阵各 OS 唯一），使用 `if: always()` 上传，即使检查失败或构建失败也保留报告。
- 检查存在 error 时（退出 1）不阻断工作流；构建步骤仅在内容检查成功时继续。
- 不依赖 Cloudflare 凭据。

## 已知限制

- `/search` 的相关性为确定性的字面匹配（复用现有搜索评分字段：标题、内容、标签），不做向量检索或同义词扩展。
- 检查器为静态分析，无法验证块引用（`^id`）、动态生成或仅在运行时存在的资源；这类情况以 `unsupported-syntax` 提示。
- `publish` 字段仅在启用 `explicit-publish` 时按现有过滤器解释；默认配置不新增语义。
- 检查器按当前启用的发布规则识别 published 边界；新增自定义过滤器时需同步检查配置。
