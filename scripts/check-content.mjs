#!/usr/bin/env -S node
/**
 * ArkDocs 本地断链/内容质量检查（离线、无需网络）。
 *
 * 运行入口：
 *   npm run check:content
 *   npm run check:content -- --root <content-dir>
 *   npm run check:content -- --root <content-dir> --format json --output reports/content-quality.json
 *
 * 退出码：
 *   0 通过（无 error；warning 不阻断构建）
 *   1 存在至少一个 error
 *   2 参数错误（未知参数、缺少参数值、--root 目录不存在、--output 未配合 --format json）
 *
 * 报告：
 *   --format text（默认）：中文摘要写到 stdout；--output 时摘要写到 stderr
 *   --format json：同一份内部问题模型序列化后写到 stdout，--output 时同时写入文件
 *
 * 规则矩阵（ruleId / level）：
 *   page-link-missing        error   页面链接指向不存在的页面
 *   asset-missing            error   本地图片/媒体资源缺失
 *   heading-missing          error   标题锚点不存在
 *   duplicate-slug           error   多个文件生成同一 slug
 *   frontmatter-missing      error   缺少 Frontmatter
 *   frontmatter-parse-failed error   Frontmatter YAML 解析失败
 *   title-missing            error   title 缺失或为空
 *   frontmatter-field-type   warning tags/draft/publish/unlisted 字段类型不安全
 *   unsupported-syntax        warning 无法静态判断的语法（如块引用 ^、查询串链接）
 *   外部 URL、代码块、行内代码、示例占位符      ignored
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"
import GithubSlugger, { slug as githubSlug } from "github-slugger"
import { unified } from "unified"
import remarkParse from "remark-parse"
import { visit } from "unist-util-visit"

const SCHEMA_VERSION = "1.0.0"
const REPO_ROOT = process.cwd()

const ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
  ".ico",
  ".bmp",
  ".pdf",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
])

// 文档中出现的示例占位符（按旧约定忽略）
const PLACEHOLDER_TARGETS = new Set([
  "页面",
  "文件路径",
  "图片路径",
  "图片.png",
  "图片.png|描述 100x200",
  "My Note",
  "my note",
  "MY NOTE",
  "Page",
  "Page#^my-block",
  "TODO",
  "DONE",
  "video",
  "audio",
  "pdf",
  ">",
  "link",
  "page",
])

const EXTERNAL_URL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

// ---------------------------------------------------------------------------
// CLI 参数
// ---------------------------------------------------------------------------

function failUsage(message) {
  console.error(`参数错误：${message}`)
  console.error(
    `用法：npm run check:content -- [--root <目录>] [--format text|json] [--output <文件>]\n` +
      `  默认扫描仓库 content/；退出码 0=通过，1=存在 error，2=参数错误。`,
  )
  process.exit(2)
}

/** 读取某个 flag 的值；若缺失或下一个 token 仍是 flag，则视为参数错误。 */
function readValue(flag, argv, i) {
  const next = argv[i + 1]
  if (next === undefined || next.startsWith("--")) {
    failUsage(`${flag} 缺少参数值`)
  }
  return next
}

function parseArgs(argv) {
  const args = { root: null, format: null, output: null }
  let i = 0
  while (i < argv.length) {
    const arg = argv[i]
    if (arg === "--root") {
      args.root = readValue("--root", argv, i)
      i += 1
    } else if (arg.startsWith("--root=")) {
      args.root = arg.slice("--root=".length)
    } else if (arg === "--format") {
      args.format = readValue("--format", argv, i)
      i += 1
    } else if (arg.startsWith("--format=")) {
      args.format = arg.slice("--format=".length)
    } else if (arg === "--output") {
      args.output = readValue("--output", argv, i)
      i += 1
    } else if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length)
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        `用法：npm run check:content -- [--root <目录>] [--format text|json] [--output <文件>]\n` +
          `  默认扫描仓库 content/；退出码 0=通过，1=存在 error，2=参数错误。`,
      )
      process.exit(0)
    } else {
      failUsage(`未知参数 ${JSON.stringify(arg)}`)
    }
    i += 1
  }

  if (args.root === null) {
    args.root = "content"
  }
  if (args.root === "") failUsage("--root 缺少目录参数")
  if (args.format === null) {
    args.format = "text"
  } else if (args.format !== "text" && args.format !== "json") {
    failUsage(`--format 仅支持 text 或 json，收到 ${JSON.stringify(args.format)}`)
  }
  if (args.output !== null && args.format !== "json") {
    failUsage("--output 必须配合 --format json 使用")
  }
  if (args.output === "") failUsage("--output 缺少文件路径参数")
  return args
}

// ---------------------------------------------------------------------------
// Slug 规则（与 @quartz-community/utils slugifyFilePath 保持一致）
// ---------------------------------------------------------------------------

function posix(p) {
  return p.split(path.sep).join("/")
}

function slugifySegment(segment) {
  return segment
    .replace(/\s/g, "-")
    .replace(/&/g, "-and-")
    .replace(/%/g, "-percent")
    .replace(/\?/g, "")
    .replace(/#/g, "")
    .replace(/[<>:"|*]/g, "")
    .toLowerCase()
}

function slugifyPath(value) {
  return value.split("/").map(slugifySegment).join("/").replace(/\/$/, "")
}

/** Quartz 页面 slug 规则：扩展名剥离 + segment slugify + index 去重。 */
function slugForFilePath(relativePath) {
  let fp = posix(relativePath).replace(/^\/+/, "")
  const withoutExt = fp.replace(/\.(md|markdown)$/i, "")
  let slug = slugifyPath(withoutExt)
  if (slug.endsWith("_index")) {
    slug = slug.replace(/_index$/, "index")
  }
  const segments = slug.split("/")
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
    slug = segments.join("/")
  }
  return slug
}

function slugTag(tag) {
  return slugifySegment(String(tag).trim())
}

/** 标题 slug（GitHub 规则，含 -1/-2 去重；与站点 heading id 一致）。 */
function makeHeadingIds(lines) {
  const slugger = new GithubSlugger()
  return lines.map((line) => slugger.slug(line))
}

// ---------------------------------------------------------------------------
// 文档收集与解析
// ---------------------------------------------------------------------------

function readIgnorePatterns() {
  try {
    const raw = fs.readFileSync(path.join(REPO_ROOT, "quartz.config.yaml"), "utf8")
    const config = YAML.parse(raw)
    const patterns = config?.configuration?.ignorePatterns
    return Array.isArray(patterns) ? patterns : ["private", "templates", ".obsidian"]
  } catch {
    return ["private", "templates", ".obsidian"]
  }
}

const IGNORE_PATTERNS = readIgnorePatterns()

function matchesIgnore(relPath) {
  const rel = posix(relPath)
  return IGNORE_PATTERNS.some((pattern) => {
    const p = String(pattern)
    if (p.endsWith("/")) return rel.startsWith(p)
    const first = rel.split("/")[0]
    return first === p || rel.includes(`/${p}`)
  })
}

function walk(rootDir, predicate) {
  const result = []
  const visit = (current, relativeBase) => {
    let entries
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      const relativePath = posix(path.join(relativeBase, entry.name))
      if (entry.isDirectory()) {
        visit(fullPath, relativePath)
      } else if (predicate(relativePath)) {
        result.push(fullPath)
      }
    }
  }
  visit(rootDir, "")
  return result
}

function parseDocument(fullPath, relativePath) {
  const source = fs.readFileSync(fullPath, "utf8")
  const document = {
    relativePath,
    source,
    frontmatter: null,
    frontmatterLine: 1,
    bodyStartLine: 1,
    body: source,
    frontmatterError: null,
    titleLine: 1,
  }

  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return document
  }
  const lineEnding = source.startsWith("---\r\n") ? "\r\n" : "\n"
  const endMarker = lineEnding + "---" + lineEnding
  const end = source.indexOf(endMarker, 4)
  if (end === -1) {
    document.frontmatterError = "未找到 Frontmatter 结束标记"
    return document
  }
  const raw = source.slice(4, end)
  try {
    const parsed = YAML.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      document.frontmatter = parsed
    }
  } catch (error) {
    document.frontmatterError = error instanceof Error ? error.message : String(error)
  }
  document.body = source.slice(end + endMarker.length)
  document.bodyStartLine = source.slice(0, end).split(lineEnding).length + 1
  const titleMatch = raw.match(/^title:\s*(.*)$/m)
  if (titleMatch) {
    const before = raw.slice(0, titleMatch.index)
    document.titleLine = 1 + before.split(lineEnding).length
  }
  return document
}

// ---------------------------------------------------------------------------
// 链接提取
// ---------------------------------------------------------------------------

const mdParser = unified().use(remarkParse)

/** 用空格遮蔽代码块与行内代码，保留换行以便行号换算。 */
function maskCodeRegions(body) {
  const lines = body.split("\n")
  let inFence = null
  return lines
    .map((line) => {
      if (!inFence) {
        const fenceMatch = line.match(/^\s*(?:`{3,}|~{3,})/)
        if (fenceMatch) {
          inFence = fenceMatch[0].trim()
          return " ".repeat(line.length)
        }
        line = line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length))
        return line
      }
      if (line.trim().startsWith(inFence[0])) {
        inFence = null
        return " ".repeat(line.length)
      }
      return " ".repeat(line.length)
    })
    .join("\n")
}

const WIKILINK_PATTERN = /(!?)\[\[([^\]]*)\]\]/g

function extractLinks(document) {
  const links = []
  const body = document.body
  const bodyStart = document.bodyStartLine

  let tree
  try {
    tree = mdParser.parse(body)
  } catch {
    return links
  }
  visit(tree, ["link", "image"], (node) => {
    if (typeof node.url !== "string" || node.url === "") return
    const line = (node.position?.start?.line ?? 1) + bodyStart - 1
    const isImage = node.type === "image"
    links.push({
      kind: isImage ? "image" : "mdlink",
      target: node.url,
      line,
    })
  })

  const masked = maskCodeRegions(body)
  let match
  WIKILINK_PATTERN.lastIndex = 0
  while ((match = WIKILINK_PATTERN.exec(masked)) !== null) {
    const embed = match[1] === "!"
    let rawTarget = match[2].split("|")[0]
    rawTarget = rawTarget.replace(/\\+$/g, "").trim()
    const line = masked.slice(0, match.index).split("\n").length + bodyStart - 1
    links.push({
      kind: embed ? "image" : "wikilink",
      target: rawTarget,
      line,
    })
  }
  return links
}

// ---------------------------------------------------------------------------
// 页面集合（真实页面 + 虚拟文件夹页/标签页）
// ---------------------------------------------------------------------------

function buildPageSet(documents) {
  const pageSlugs = new Set()
  const slugSources = new Map()
  const virtualFolderSlugs = new Set()
  const virtualTagSlugs = new Set()
  const allFilePaths = []

  for (const doc of documents) {
    allFilePaths.push(doc.relativePath)
    const slug = slugForFilePath(doc.relativePath)
    pageSlugs.add(slug)
    if (!slugSources.has(slug)) {
      slugSources.set(slug, [])
    }
    slugSources.get(slug).push({ source: doc.relativePath, line: doc.titleLine })
  }

  for (const rel of allFilePaths) {
    if (/\.(canvas|base)$/i.test(rel)) {
      pageSlugs.add(slugForFilePath(rel))
    }
  }

  const dirs = new Set()
  for (const rel of allFilePaths) {
    const parts = rel.split("/")
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join("/"))
    }
  }
  for (const dir of dirs) {
    const hasIndex = allFilePaths.some(
      (rel) => rel === `${dir}/index.md` || rel === `${dir}/index.markdown`,
    )
    if (!hasIndex) {
      virtualFolderSlugs.add(`${slugifyPath(dir)}/index`)
    }
  }
  for (const doc of documents) {
    const tags = Array.isArray(doc.frontmatter?.tags) ? doc.frontmatter.tags : []
    for (const tag of tags) {
      if (typeof tag === "string" && tag.trim()) {
        virtualTagSlugs.add(`tags/${slugTag(tag)}`)
      }
    }
  }

  return { pageSlugs, slugSources, virtualFolderSlugs, virtualTagSlugs }
}

function linkTargetCandidates(targetPath, currentRelativePath) {
  const results = new Set()
  let decoded = targetPath
  try {
    decoded = decodeURIComponent(targetPath)
  } catch {
    decoded = targetPath
  }
  const p = decoded.startsWith("/")
    ? decoded.slice(1)
    : path.posix.join(path.posix.dirname(currentRelativePath), decoded)
  const withoutExt = p.replace(/\.(md|markdown)$/i, "")

  results.add(slugForFilePath(withoutExt + ".md"))
  results.add(`${slugifyPath(withoutExt)}/index`)

  const stem = path.posix.basename(withoutExt)
  const stemSlug = slugifySegment(stem)
  if (stem) {
    const matchTargets = [
      ...[...pageSet.pageSlugs],
      ...[...pageSet.virtualFolderSlugs],
      ...[...pageSet.virtualTagSlugs],
    ]
    for (const s of matchTargets) {
      if (s === stemSlug || s.endsWith(`/${stemSlug}`)) results.add(s)
    }
  }
  return results
}

let pageSet = {
  pageSlugs: new Set(),
  slugSources: new Map(),
  virtualFolderSlugs: new Set(),
  virtualTagSlugs: new Set(),
}

// ---------------------------------------------------------------------------
// 问题模型
// ---------------------------------------------------------------------------

const issues = []
function addIssue(ruleId, level, source, line, target, message) {
  issues.push({
    ruleId,
    level,
    source,
    line: typeof line === "number" && Number.isFinite(line) ? line : null,
    target: target ?? null,
    message,
  })
}

function sortIssues(list) {
  return [...list].sort((a, b) => {
    if (a.source !== b.source) return a.source < b.source ? -1 : 1
    if ((a.line ?? Infinity) !== (b.line ?? Infinity)) {
      return (a.line ?? Infinity) - (b.line ?? Infinity)
    }
    if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1
    if ((a.target ?? "") !== (b.target ?? "")) return (a.target ?? "") < (b.target ?? "") ? -1 : 1
    return (a.message ?? "") < (b.message ?? "") ? -1 : 1
  })
}

// ---------------------------------------------------------------------------
// 文档检查
// ---------------------------------------------------------------------------

function checkFrontmatter(document) {
  const fm = document.frontmatter
  if (document.frontmatterError) {
    addIssue(
      "frontmatter-parse-failed",
      "error",
      document.relativePath,
      1,
      null,
      `Frontmatter 解析失败：${document.frontmatterError}`,
    )
    return
  }
  if (!fm) {
    addIssue(
      "frontmatter-missing",
      "error",
      document.relativePath,
      1,
      null,
      "缺少 Frontmatter（文件需以 --- 开始）",
    )
    return
  }
  if (typeof fm.title !== "string" || !fm.title.trim()) {
    addIssue("title-missing", "error", document.relativePath, 1, null, "title 缺失或为空字符串")
    return
  }

  if (fm.tags !== undefined && fm.tags !== null) {
    if (typeof fm.tags !== "string" && !Array.isArray(fm.tags)) {
      addIssue(
        "frontmatter-field-type",
        "warning",
        document.relativePath,
        1,
        "tags",
        "tags 应为字符串或数组",
      )
    } else if (Array.isArray(fm.tags)) {
      const bad = fm.tags.some((tag) => typeof tag !== "string" && typeof tag !== "number")
      if (bad) {
        addIssue(
          "frontmatter-field-type",
          "warning",
          document.relativePath,
          1,
          "tags",
          "tags 数组元素应为字符串",
        )
      }
    }
  }
  for (const field of ["draft", "publish", "unlisted"]) {
    if (
      fm[field] !== undefined &&
      fm[field] !== null &&
      typeof fm[field] !== "boolean" &&
      typeof fm[field] !== "string"
    ) {
      addIssue(
        "frontmatter-field-type",
        "warning",
        document.relativePath,
        1,
        field,
        `${field} 应为布尔值或字符串`,
      )
    }
  }
}

function headingIdsOf(document) {
  const lines = []
  for (const line of document.body.split("\n")) {
    const match = line.match(/^(?:#{1,6})\s+(.+?)\s*#*\s*$/)
    if (match) {
      const text = match[1]
        .replace(/`[^`]*`/g, (m) => m.slice(1, -1))
        .replace(/\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
      lines.push(text)
    }
  }
  return makeHeadingIds(lines)
}

function checkAnchor(document, anchor, targetPageSlug, linkLine) {
  let decoded = anchor
  try {
    decoded = decodeURIComponent(anchor)
  } catch {
    decoded = anchor
  }
  const bare = decoded.startsWith("^") ? decoded.slice(1) : decoded
  if (decoded.includes("^")) {
    addIssue(
      "unsupported-syntax",
      "warning",
      document.relativePath,
      linkLine,
      anchor,
      "块引用锚点（^）无法静态验证",
    )
    return
  }
  const targetDoc = documentsBySlug.get(targetPageSlug)
  if (!targetDoc) return
  const ids = headingIdCache.get(targetDoc.relativePath) ?? []
  const candidates = [bare, slugifyAnchorLike(bare)]
  if (candidates.some((c) => ids.includes(c))) return
  addIssue(
    "heading-missing",
    "error",
    document.relativePath,
    linkLine,
    targetPageSlug + "#" + decoded,
    `页面 ${targetPageSlug} 中不存在标题锚点 #${decoded}`,
  )
}

function slugifyAnchorLike(text) {
  return githubSlug(text)
}

const documentsBySlug = new Map()
const headingIdCache = new Map()

function checkLinks(document) {
  const links = extractLinks(document)
  let pageLinkCount = 0
  let assetCount = 0

  for (const link of links) {
    const raw = link.target
    if (EXTERNAL_URL.test(raw)) continue
    if (raw === "") continue

    const [targetPart, anchorPart] = raw.split("#", 2)
    const decodedPart = (() => {
      try {
        return decodeURIComponent(targetPart)
      } catch {
        return targetPart
      }
    })()

    if (PLACEHOLDER_TARGETS.has(raw)) continue
    if (anchorPart !== undefined && anchorPart.includes("^")) {
      addIssue(
        "unsupported-syntax",
        "warning",
        document.relativePath,
        link.line,
        raw,
        "块引用（^）语法无法静态验证",
      )
      continue
    }
    if (decodedPart.includes("?")) {
      addIssue(
        "unsupported-syntax",
        "warning",
        document.relativePath,
        link.line,
        raw,
        "带查询串的链接无法静态验证路径",
      )
      continue
    }

    const isImageLike = link.kind === "image"
    const assetExt = (decodedPart
      .split("?")[0]
      .split("#")[0]
      .match(/\.[A-Za-z0-9]+$/) || [""])[0].toLowerCase()
    const isAsset = isImageLike || ASSET_EXTENSIONS.has(assetExt)

    if (decodedPart === "") {
      if (anchorPart !== undefined) {
        checkAnchor(document, anchorPart, slugForFilePath(document.relativePath), link.line)
      }
      continue
    }

    const resolvedAsset = path.posix.join(path.posix.dirname(document.relativePath), decodedPart)
    const assetOnDisk = path.join(REPO_ROOT, args.root, resolvedAsset.split("/").join(path.sep))
    if (isAsset) {
      if (!fs.existsSync(assetOnDisk)) {
        addIssue(
          "asset-missing",
          "error",
          document.relativePath,
          link.line,
          raw,
          `本地资源不存在：${resolvedAsset}`,
        )
      } else {
        assetCount += 1
      }
      continue
    }

    pageLinkCount += 1
    const candidates = linkTargetCandidates(decodedPart, document.relativePath)
    const resolved =
      [...candidates].find((c) => pageSet.pageSlugs.has(c)) ??
      [...candidates].find((c) => pageSet.virtualFolderSlugs.has(c)) ??
      [...candidates].find((c) => pageSet.virtualTagSlugs.has(c))

    if (!resolved) {
      addIssue(
        "page-link-missing",
        "error",
        document.relativePath,
        link.line,
        raw,
        `页面不存在：${decodedPart}`,
      )
      continue
    }

    if (anchorPart !== undefined && anchorPart !== "") {
      checkAnchor(document, anchorPart, resolved, link.line)
    }
  }
  return { pageLinkCount, assetCount }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

let args
try {
  args = parseArgs(process.argv.slice(2))
} catch (error) {
  if (error instanceof Error && error.message === "exit") process.exit(2)
  throw error
}

const rootDir = path.resolve(REPO_ROOT, args.root)
if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
  failUsage(`--root 目录不存在：${args.root}`)
}

const mdFiles = walk(rootDir, (rel) => /\.(md|markdown)$/i.test(rel)).sort()
const documents = mdFiles.map((full) => parseDocument(full, posix(path.relative(rootDir, full))))

pageSet = buildPageSet(documents)
for (const [slug, sources] of pageSet.slugSources) {
  if (sources.length > 1) {
    for (const source of sources) {
      addIssue(
        "duplicate-slug",
        "error",
        source.source,
        source.line,
        slug,
        `与 ${sources
          .filter((s) => s.source !== source.source)
          .map((s) => s.source)
          .join("、")} 生成重复 slug ${slug}`,
      )
    }
  }
}

for (const document of documents) {
  checkFrontmatter(document)
}

for (const document of documents) {
  const slug = slugForFilePath(document.relativePath)
  documentsBySlug.set(slug, document)
  headingIdCache.set(document.relativePath, headingIdsOf(document))
}

let totalPageLinks = 0
let totalAssets = 0
for (const document of documents) {
  const result = checkLinks(document)
  totalPageLinks += result.pageLinkCount
  totalAssets += result.assetCount
}

const sortedIssues = sortIssues(issues)
const errorCount = sortedIssues.filter((i) => i.level === "error").length
const warningCount = sortedIssues.filter((i) => i.level === "warning").length

const report = {
  schemaVersion: SCHEMA_VERSION,
  root: posix(args.root),
  stats: {
    documents: documents.length,
    pages: pageSet.pageSlugs.size + pageSet.virtualFolderSlugs.size + pageSet.virtualTagSlugs.size,
    assets: totalAssets,
    links: totalPageLinks,
    errors: errorCount,
    warnings: warningCount,
  },
  issues: sortedIssues,
}

const summary = (() => {
  const lines = []
  if (errorCount > 0) {
    lines.push(`内容检查失败：发现 ${errorCount} 个 error，${warningCount} 个 warning`)
  } else if (warningCount > 0) {
    lines.push(`内容检查通过（有 ${warningCount} 个 warning，不阻断构建）`)
  } else {
    lines.push("内容检查通过")
  }
  lines.push(
    `扫描 ${report.stats.documents} 篇文档 / ${report.stats.pages} 个页面 / ${report.stats.assets} 个本地资源 / ${report.stats.links} 个页面链接，${errorCount} 个 error，${warningCount} 个 warning`,
  )
  for (const issue of sortedIssues) {
    const location = issue.line ? `:${issue.line}` : ""
    const target = issue.target ? ` → ${issue.target}` : ""
    lines.push(
      `- [${issue.level}] [${issue.ruleId}] ${issue.source}${location}${target}：${issue.message}`,
    )
  }
  return lines.join("\n")
})()

if (args.format === "json") {
  const jsonText = JSON.stringify(report, null, 2)
  if (args.output !== null) {
    const outputPath = path.resolve(REPO_ROOT, args.output)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, jsonText + "\n", "utf8")
    console.error(summary)
  } else {
    console.log(jsonText)
    console.error(summary)
  }
} else {
  console.log(summary)
}

process.exitCode = errorCount > 0 ? 1 : 0
