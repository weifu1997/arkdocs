# 内容维护验证文档

本文档记录 ArkDocs 两项内容维护能力的入口、命令、退出码、报告字段、常见修复与已知限制。所有验证均可离线完成，不依赖网络、API Key、数据库或运行时服务。

## 功能一：公开搜索筛选

### 入口

- 读者从现有搜索入口进入：
  - 点击顶部工具栏的搜索按钮，或按 `Ctrl/⌘+K` 打开搜索弹层；
  - 在查询为空时按 Enter，或按 `Ctrl/⌘+Shift+O`，会以 SPA 导航进入公开 `/search` 页面（遵循 `baseUrl` 前缀，例如本地 `npm run dev` 时导航到 `/arkdocs/search`）。
  - 搜索弹层自身的快捷键、预览弹出、移动端布局和 SPA 行为保持不变。
- `/search` 支持的 URL 参数（均通过 `URLSearchParams` 编码中文、空格与连字符，刷新或复制 URL 后状态一致）：

```text
/search?q=<查询词>&tag=<标签>&tag=<标签>&folder=<文件夹>
```

- 筛选规则：
  - `q`：查询词，可空；匹配标题、标签和正文的归一化子串，覆盖中文连续片段、英文、数字、连字符，大小写归一化。
  - `tag`：可重复出现，多个标签之间为 AND 关系；比较忽略大小写与首尾空白。
  - `folder`：规范化文件夹路径，匹配该文件夹及其全部子目录；空查询且存在筛选条件时返回符合条件的 published 页面，完全空状态显示初始提示而不罗列全站页面。
- 排序规则（固定字段，顺序确定）：
  - 相关性权重：标题 30、标签 20、正文 10；
  - 完全匹配/前缀匹配获得加权；
  - 最终排序为相关性降序、规范化 slug 升序（tie-breaker 不依赖文件系统或修改时间，同一输入重复运行结果完全一致）。
- 状态：初始状态、加载中、有结果、无匹配结果、索引加载失败（显示“搜索索引加载失败”）。

### Published 边界（公开 Content Index 与 `/search` 的准入条件）

| 条件 | 状态 | 公开行为 |
| --- | --- | --- |
| `draft: true` | draft | 不在公开 `/search`、公开 `/search` URL 或公开 Content Index 中出现 |
| `unlisted: true` | unlisted | 不在公开搜索发现界面出现，仍可通过 URL 直接访问 |
| 命中 `ignorePatterns`（如 `private/`） | private/ignored | 不进入公开索引 |
| 其余页面 | published | 可被公开搜索发现 |

未新增 `publish` 字段语义；`quartz.config.yaml` 中 `explicit-publish` 当前未启用，因此不会自行解释 `publish: false`。

### 复现命令

```bash
npm run test:content-discovery
```

该命令只运行离线测试：`quartz/components/scripts/search-adapter.test.ts`（URL 解析/往返、匹配、排序、published 边界）和 `quartz/components/scripts/search-page.test.ts`（`/search` 路由契约）。测试使用独立 fixture `fixtures/content-discovery/`，不修改真实 `content/`。

## 功能二：作者本地断链检查

### 入口

在本地知识库维护流程中运行 CLI（不需要在 Git 服务器或云端运行）：

```bash
npm run check:content
npm run check:content -- --root <content-dir>
npm run check:content -- --root <content-dir> --format json
npm run check:content -- --root <content-dir> --format json --output reports/content-quality.json
```

- 默认扫描仓库 `content/`，输出中文摘要到 stdout。
- 终端摘要与 JSON 报告来自同一份内部问题模型，无第二份实现。

### CLI 契约与退出码

| 情况 | 退出码 |
| --- | --- |
| 只有 warning，没有 error | 0 |
| 存在至少一个 error | 1 |
| 目录不存在/不是目录、未知参数、缺少参数、`--format` 非 text/json、`--output` 未配合 `--format json` | 2 |

### 规则矩阵

| ruleId | level | 说明 |
| --- | --- | --- |
| `page-link-missing` | error | 页面链接指向不存在的页面（Wikilink 与 Markdown 相对链接，支持 URL 编码、中文与空格路径） |
| `asset-missing` | error | 本地图片/媒体/Canvas/Base 资源引用失效 |
| `heading-missing` | error | 标题锚点不存在，按 Quartz 实际 slug 规则检查 |
| `duplicate-slug` | error | 多个页面生成同一 slug（报告含全部冲突文件） |
| `frontmatter-missing` | error | 缺少 Frontmatter 块 |
| `frontmatter-parse-failed` | error | Frontmatter YAML 解析失败 |
| `title-missing` | error | Frontmatter 缺少非空 `title` |
| `frontmatter-field-type` | warning | `tags`/`draft`/`publish`/`unlisted` 字段类型不安全 |
| `unsupported-syntax` | warning | 静态分析无法可靠判定的语法（如块引用） |

### JSON 报告字段

```json
{
  "schemaVersion": 1,
  "scannedRoot": "<扫描根目录，使用 / 路径分隔符>",
  "stats": {
    "documents": 1,
    "pages": 1,
    "links": 1,
    "assets": 1,
    "errors": 1,
    "warnings": 1
  },
  "issues": [
    {
      "ruleId": "page-link-missing",
      "level": "error",
      "file": "relative/path/to/file.md",
      "line": 3,
      "target": "missing-page",
      "message": "页面链接 `missing-page` 指向不存在的页面。",
      "conflicts": [{ "file": "a.md", "line": 1 }]
    }
  ]
}
```

- `file` 使用相对路径与 `/` 分隔符，不包含机器专属绝对路径。
- 问题数组按文件、行号、ruleId、目标排序，内容稳定可复现。
- `--format json` 输出到 stdout；`--output` 自动创建父目录并写入完全相同的 JSON，摘要写到 stderr。
- 外部 URL、代码块、行内代码和明确的示例占位符（如 `[[Page]]`、`页面#小标题`）不作为问题上报。

### 复现命令

```bash
npm run test:content-quality
npm run check:content -- --root fixtures/content-quality --format json --output reports/content-quality.json
npm run check:content -- --root fixtures/content-quality-valid
```

- `fixtures/content-quality/` 为坏样本（含全部 error 与 warning 示例），CLI 退出码 1。
- `fixtures/content-quality-valid/` 为合法样本（含虚拟文件夹页/标签页、草稿、未列出页、代码示例），CLI 退出码 0。
- 同一 fixture 连续运行两次，JSON 内容完全一致。

## CI 与发布保障

GitHub Actions（`.github/workflows/ci.yaml`）在 Windows、macOS、Linux 三个矩阵上于 Quartz 构建前执行：

1. `npm run test:content-discovery`
2. `npm run test:content-quality`
3. `npm test`
4. `npm run check:content -- --format json --output reports/content-quality.json`
5. 以 `if: always()` 上传报告，artifact 名称包含 `${{ matrix.os }}`（例如 `content-quality-report-ubuntu-latest`），即使质量检查失败也会保留报告。

## 常见修复

- 失效页面链接：移动或重命名页面后更新旧链接，或为目标创建页面。
- 失效资源：修正相对路径，或把图片放入 `images/` 等既有资源目录。
- 标题锚点：保持锚点与目标页面标题一致（Quartz slug 规则会做小写化、空格转连字符等处理）。
- 重复 slug：对同目录下的 `duplicate.md` 与 `duplicate/index.md` 只保留其一，或重命名文件/目录。
- Frontmatter 问题：补全块、修正 YAML、补 `title`；为 `tags`/`draft`/`publish`/`unlisted` 使用数组或布尔值，不要为了通过检查删除或屏蔽问题。

## 已知限制与非目标

- 不实现公开日期筛选、公开草稿/未列出筛选、向量检索、远程 Embedding、问答、数据库、云端搜索、相关内容推荐、上一篇/下一篇、时间线/归档、孤立页面治理、标签词典、增量缓存、SARIF、多语言搜索或完整内容管理平台。
- 不删除现有 search、graph、backlinks、explorer、folder-page、tag-page，不重写真实内容，不改变 `content/` 根目录。
- 块引用（`^...`）等需要运行时确认的语法只产出 `unsupported-syntax` warning，不伪造为成功。
