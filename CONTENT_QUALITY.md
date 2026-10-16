# 内容质量与搜索功能维护文档

## 概述

本文档记录 ArkDocs 的两个垂直功能：公开搜索筛选（`/search`）和作者本地断链检查（`check:content` CLI）。

---

## 1. 公开搜索筛选（`/search`）

### 入口

读者点击现有搜索入口进入公开 `/search` 页面。URL 契约：

```text
/search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>
```

- `q`：查询词，可以为空；
- `tag`：可重复，多个标签使用 AND；标签比较忽略大小写和首尾空白；
- `folder`：规范化文件夹路径；文件夹比较使用 URL 解码后的路径，并匹配该文件夹及其子目录；
- 参数使用 `URLSearchParams` 正确编码中文、空格和连字符；
- 刷新 `/search?...` 或复制 URL 后，结果和筛选状态保持一致；
- 未知标签或文件夹显示“无匹配结果”，无效 URL 编码不得使脚本崩溃；
- 不得添加 `status=draft`、`status=unlisted` 或公开日期参数。

### 数据与排序

浏览器端不重新解析 Markdown。构建阶段生成 `static/searchIndex.json`，包含：

- `slug`、`title`、`description`、`content`、`tags`、`folder`、`icon`、`fallback`、`score`

查询匹配覆盖中文连续片段、英文、数字、连字符和中英混合文本，保持大小写归一化稳定。结果排序确定：先按匹配相关性，再按规范化 slug 升序作为最终 tie-breaker。

每条结果至少显示标题、摘要、路径/文件夹、标签和可访问链接。

### 状态映射

按以下固定映射判断发布状态：

- `draft: true` 为 draft
- `unlisted: true` 为 unlisted
- 位于 `quartz.config.yaml` 的 `ignorePatterns` 中或由现有 Quartz 发布插件过滤的页面为 private/ignored
- 其余页面为 published

公开 Content Index 和 `/search` 必须排除 draft、private 和 unlisted 页面。

### 复现命令

```bash
npm run test:content-discovery
```

### Fixture 路径

```text
fixtures/content-discovery/
```

---

## 2. 作者本地断链检查（`check:content` CLI）

### 运行入口

```bash
npm run check:content
npm run check:content -- --root <content-dir>
npm run check:content -- --root <content-dir> --format json --output reports/content-quality.json
```

### 参数契约

- 默认扫描仓库 `content/`，输出简洁中文摘要；
- `--root` 指定独立内容目录；目录不存在、未知参数或参数缺失时输出可理解错误并退出 `2`；
- `--format text|json` 选择报告格式；`--format json` 把 JSON 报告写到 stdout；
- 指定 `--output` 时自动创建缺失的父目录，把完全相同的 JSON 写入文件，摘要写到 stderr；
- `--output` 未配合 `--format json` 时视为参数错误并退出 `2`；
- 存在至少一个 `error` 时退出 `1`；只有 warning 或没有问题时退出 `0`；
- 不要求网络、API Key、数据库或运行时服务。

### 规则矩阵

| ruleId | level | 退出码 1 |
| --- | --- | --- |
| `page-link-missing` | error | 是 |
| `asset-missing` | error | 是 |
| `heading-missing` | error | 是 |
| `duplicate-slug` | error | 是 |
| `frontmatter-missing` | error | 是 |
| `frontmatter-parse-failed` | error | 是 |
| `title-missing` | error | 是 |
| `frontmatter-field-type` | warning | 否 |
| `unsupported-syntax` | warning | 否 |
| 外部 URL、代码块、行内代码和明确示例占位符 | ignored | 否 |

页面和资源目标支持 Wikilink、Markdown 相对路径、URL 编码路径、中文路径和空格路径。标题锚点按 Quartz 实际使用的 slug 规则检查。

### JSON 报告字段

- `schemaVersion`
- `root`
- `stats`：`documents`、`pages`、`assets`、`links`、`errors`、`warnings`
- `issues`：稳定排序的问题数组，每条至少包含 `ruleId`、`level`、`source`、`line`、`target`、`message`

### 复现命令

```bash
npm run test:content-quality
npm run check:content -- --root fixtures/content-quality --format json --output reports/content-quality.json
```

### Fixture 路径

```text
fixtures/content-quality/
fixtures/content-quality-valid/
```

---

## 3. CI 保障

GitHub Actions 在 Quartz 构建前运行 `npm run check:content -- --format json --output reports/content-quality.json`。

对现有 OS 矩阵，报告上传步骤使用 `if: always()`，并使用包含 `${{ matrix.os }}` 的唯一 artifact 名称（例如 `content-quality-report-${{ matrix.os }}`），即使质量检查失败也保留对应报告。

---

## 4. 验收清单

评测者按以下顺序验证：

1. 阅读本文档，能找到 `/search`、CLI 命令、三个 fixture 路径、报告位置和退出码说明。
2. 运行 `npm run test:content-discovery`，验证 `fixtures/content-discovery/` 的中文/中英混合查询、标签+文件夹组合筛选、多个标签 AND、URL 往返、published 边界、稳定排序和无结果状态。
3. 运行 `npm run test:content-quality`，再执行：

   ```bash
   npm run check:content -- --root fixtures/content-quality --format json --output reports/content-quality.json
   ```

   该命令应退出 `1`；`reports/content-quality.json` 可被另一个 Node 程序解析，并能定位断链、资源、锚点和重复 slug。命令行参数错误应退出 `2`。

4. 对 `fixtures/content-quality/` 重复运行，JSON 的问题顺序和内容一致；运行 `npm run check:content -- --root fixtures/content-quality-valid` 时退出码为 `0`；`frontmatter-field-type` 和 `unsupported-syntax` warning 不应阻断构建，但缺失/解析失败 Frontmatter 和缺失 `title` 必须阻断构建。
5. 在 Windows、macOS 或 Linux 任一环境运行 `npm run check:types`、`npm run check:format`、相关测试和 `node quartz/bootstrap-cli.mjs build --bundleInfo -d content`，确认现有站点功能没有回归，也没有公开暴露草稿或未列出页面。

---

## 5. 已知限制

- 公开搜索只包含最终可发布页面。草稿、私有页和未列出页不得被公开搜索、公开 `/search` URL 或公开 Content Index 暴露；它们只在本地质量检查中被识别并按现有 Quartz 发布规则处理。
- 公开搜索只包含标题、摘要、路径/文件夹、标签和可访问链接。不包含日期筛选、向量检索、远程 Embedding、问答、数据库、云端搜索、相关内容推荐、上一篇/下一篇、时间线/归档、孤立页面治理、标签词典、增量缓存、SARIF、多语言搜索或完整内容管理平台。
- 作者本地断链检查只检查页面链接、本地资源、标题锚点、重复 slug 和 Frontmatter。不检查外部链接、代码块、行内代码和明确示例占位符。
- CLI、JSON 和 CI 的实现不单独增加产品评分；评分看它们是否可靠地承载本地断链检查结果。
