# 内容维护：公共搜索与本地死链检查

本页说明本次垂直功能切片的入口、离线验证方式、退出码、报告位置与已知限制。
所有检查都可在无网络环境下完成，不依赖任何外部服务。

## 一、公共搜索（`/search`）

### 入口

- 全站任意页面右上角工具栏中的「搜索」按钮（`.search-button`）。
  点击后经 SPA 导航进入逻辑路由 `/search`（开发服务器与 `/arkdocs` 子路径部署都会带正确前缀）。
- 直接访问 `/search` 或带参数的 `/search?...` 也可进入。

### URL 参数

`/search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>`

| 参数     | 作用                   | 规则                                                                                   |
| -------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `q`      | 关键词查询             | 中文逐字匹配，英文/数字按整词、非字母数字边界匹配；空格等均由 URLSearchParams 正确编码 |
| `tag`    | 标签筛选（可重复）     | 出现多次时为 **AND** 关系；先 trim 再转小写后比较                                      |
| `folder` | 文件夹筛选（含子目录） | 归一化（去 `/`、`./`、结尾斜杠）后按 slug 前缀匹配                                     |

- 刷新、复制地址、SPA 前进/后退都会还原与当前 URL 完全一致的筛选状态。
- 初始状态（无任何参数）**不渲染整站列表**，仅显示输入提示。
- 草稿（`draft`）与未列出（`unlisted`）内容不会进入公开索引，因此无法被搜索到，也不会作为结果出现。
- 排序：有关键词时按相关度降序，相同相关度按 slug 升序；无关键词时按 slug 升序。

实现位置：

- 纯逻辑（参数解析、过滤、排序）：`quartz/search/contentDiscovery.ts`
- 页面脚本：`quartz/search/search.inline.ts`
- 页面类型（虚拟 `/search` 页）：`quartz/plugins/pageTypes/search.ts`、`quartz/components/pages/Search.tsx`

## 二、作者本地死链检查

命令：`node scripts/check-content.mjs`（等价于 `npm run check:content`）

常用参数：

| 参数                  | 含义                                                                |
| --------------------- | ------------------------------------------------------------------- |
| `--root <dir>`        | 待扫描内容目录，默认 `content`                                      |
| `--format text\|json` | 输出格式，默认 `text`                                               |
| `--output <file>`     | JSON 报告写入文件（仅配合 `--format json`）；父目录不存在时自动创建 |
| `--help`              | 打印用法                                                            |

退出码约定：

| 退出码 | 含义                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| `0`    | 未发现 error（允许仅存在 warning）                                                                           |
| `1`    | 至少存在一个 error（断链、标题缺失、重复 slug、frontmatter 缺失/解析失败/缺标题等）                          |
| `2`    | 参数错误（未知参数、`--root`/`--format`/`--output` 缺值、`--output` 未配 `--format json`、扫描目录不存在等） |

规则（9 条）：

- error：`page-link-missing`、`asset-missing`、`heading-missing`、`duplicate-slug`、
  `frontmatter-missing`、`frontmatter-parse-failed`、`title-missing`
- warning：`frontmatter-field-type`、`unsupported-syntax`

说明：

- JSON 报告输出到 **stdout**，中文摘要输出到 **stderr**，二者互不串扰，便于在 CI 中捕获。
- `--output` 写出的文件内容与 stdout 的 JSON 完全一致；同一输入多次运行得到的报告逐字节相同（稳定排序）。
- 路径均为相对扫描根的 POSIX 路径（Windows/macOS/Linux 行为一致，不含反斜杠与机器绝对路径）。

## 三、离线测试

```bash
# 公共搜索逻辑 + /search 路由/页面集成
npm run test:content-discovery

# 本地死链检查（坏样本、合法样本、真实 content/ 扫描）
npm run test:content-quality

# 全部离线测试
npm test
```

夹具目录：

- `fixtures/content-discovery/pages/`：中文/混合页面、`stable-a`/`stable-b` 同分页、
  `draft.md`、`unlisted.md` 等。
- `fixtures/content-quality/`：坏样本目录（断链、缺 frontmatter、坏 YAML、缺标题、
  字段类型、重复 slug、代码占位符、外链等）。
- `fixtures/content-quality-valid/`：含中文路径、空格路径与合法本地引用的正常样本。

## 四、验收清单

| 场景                 | 期望                            | 命令                                                                                 |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| 真实 `content/` 扫描 | 退出码 0                        | `npm run check:content`                                                              |
| 合法夹具             | 退出码 0                        | `node scripts/check-content.mjs --root fixtures/content-quality-valid --format json` |
| 坏样本               | 退出码 1                        | `node scripts/check-content.mjs --root fixtures/content-quality --format json`       |
| JSON 报告            | 可解析，且多次运行一致          | `--format json`（stdout）                                                            |
| CI 矩阵              | 跨 Windows/macOS/Linux 行为一致 | `.github/workflows/ci.yaml`                                                          |

## 五、报告位置

- 默认文本报告：stdout。
- 带 `--output` 的 JSON 报告：指定文件路径（父目录自动创建）。
- 在 CI 中建议：`npm run check:content`（纯文本到 stdout 即可，退出码决定流水线成败）。

## 六、已知限制

1. **标题编号**：标题形如 `### 2. 过滤器插件（Filters）`，正文链接常省略编号
   （`#过滤器插件（Filters）`）。检查器会同时注册「原始」与「去编号」两种标题 slug 以兼容；
   若标题包含更复杂的编号形式（如多级 `2.1.`），仍以完整标题文字为准。
2. **外链与 angle-bracket 包裹**：目标用 `<...>` 包裹的外链（含括号的 URL，如
   `[glob](<https://.../Glob_(programming)>)`）会先剥离 `<...>` 再判定为外部并跳过。
3. **代码中的链接**：fenced code 块与行内代码不会被当作真实链接，可能的占位仅触发
   `unsupported-syntax`（warning），不会报断链。
4. **静态资源扫描范围**：按常见图片/音视频/附件扩展名判断 `.png/.jpg/.gif/.svg/.pdf/.mp4`
   等；自定义二进制或罕见扩展名的资源若未列入白名单，不会被校验（也不会误报）。
5. **`check:types` 的既有提示**：`quartz/components/scripts/spa.inline.ts` 存在一处
   与本切片无关的类型标注不匹配（`spaNavigate` 签名），不在本次范围内。
6. **`formatCollisionWarning` 的既有测试**：`quartz/util/slugCollisions.test.ts` 中 3 个
   子测试期望英文文案，而实现为中文，属既有差异，不在本次范围内。
7. 搜索索引仅来自构建时的公开内容索引；新增/修改内容需重新 `build` 后才会出现在搜索结果中。
