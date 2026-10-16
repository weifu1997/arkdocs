#!/usr/bin/env node
/**
 * 作者本地断链检查（离线，无网络依赖）。
 *
 * 检查 `content/` 中的 Markdown、Frontmatter、页面链接和本地资源引用：
 *
 *   npm run check:content
 *   npm run check:content -- --root <content-dir>
 *   npm run check:content -- --root <content-dir> --format json --output reports/content-quality.json
 *
 * 退出码：
 *   0 — 没有 error（只有 warning 或没有问题）；
 *   1 — 存在至少一个 error；
 *   2 — CLI 参数错误 / 内容目录不存在或不是目录。
 *
 * JSON 报告写到 stdout（`--format json`），摘要写到 stderr；指定 `--output`
 * 时报告同时写入文件，路径自动创建缺失的父目录。Windows / macOS / Linux
 * 行为一致，不使用 `mkdir -p` 等 Unix 专属命令。
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

// ---------------------------------------------------------------------------
// 规则定义
// ---------------------------------------------------------------------------

const RULES = {
  "page-link-missing": "error",
  "asset-missing": "error",
  "heading-missing": "error",
  "duplicate-slug": "error",
  "frontmatter-missing": "error",
  "frontmatter-parse-failed": "error",
  "title-missing": "error",
  "frontmatter-field-type": "warning",
  "unsupported-syntax": "warning",
}

const SCHEMA_VERSION = "1"

// 与 ContentIndex / 搜索组件保持一致的资源扩展名。
const ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".ico",
  ".avif",
  ".pdf",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".mp4",
  ".webm",
  ".mov",
])

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".ico",
  ".avif",
])

// ---------------------------------------------------------------------------
// Slug 工具（按 Quartz 实际生成规则）
// ---------------------------------------------------------------------------

/**
 * 与 @quartz-community/utils 的 slugifyFilePath 等价：逐段替换空白为连字符、
 * 删除 % 并将其后字符转为 "percent"、& 转为 "and-"，删除其余被禁止字符，
 * 转小写；`_index` 还原为 `index`，同目录文件与目录同名时折叠为 index。
 */
function slugifyFilePath(fp) {
  let slug = fp
    .replaceAll("\\", "/")
    .replace(/\.(md|markdown|html)$/i, "")
    .split("/")
    .map((segment) =>
      segment
        .replace(/\s+/g, "-")
        .replace(/&/g, "-and-")
        .replace(/%/g, "-percent")
        .replace(/\?/g, "")
        .replace(/#/g, "")
        .replace(/[<>:"|*]/g, "")
        .toLowerCase(),
    )
    .join("/")
  if (slug.endsWith("_index")) slug = slug.replace(/_index$/, "index")
  const segments = slug.split("/")
  // 与 @quartz-community/utils 的 slugifyFilePath 一致：当文件名与其父目录
  // 同名时，折叠为 <dir>/index（跨目录 Folder Notes 约定）。
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
    slug = segments.join("/")
  }
  // 顶层目录与其 index 文件同名时（如 duplicate/index.md），折叠为 duplicate。
  if (segments.length === 2 && segments[1] === "index" && segments[0] !== "index") {
    slug = segments[0]
  }
  return slug
}

/** 与 github-slugger 的 slug() 等价的标题锚点规范化。 */
function slugifyHeading(text) {
  return text
    .replace(/[^\w\s-一-鿿]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
}

function simplifySlug(fp) {
  let res = fp
  if (res.endsWith("/index")) res = res.slice(0, -"/index".length)
  return res
}

function trimLeadingSlashes(s) {
  return s.replace(/^\/+/, "")
}

// ---------------------------------------------------------------------------
// 遍历与文档结构
// ---------------------------------------------------------------------------

function walkContent(root) {
  const files = []
  const directories = new Set()
  const markdownPaths = []

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(root, fullPath).replaceAll(path.sep, "/")
      files.push(relativePath)
      if (entry.isDirectory()) {
        directories.add(relativePath)
        walk(fullPath)
      } else if (entry.isFile()) {
        if (/\.(md|markdown)$/i.test(entry.name)) markdownPaths.push(relativePath)
      }
    }
  }

  walk(root)
  return { files, directories, markdownPaths }
}

function parseDocument(relativePath, source) {
  let frontmatter = null
  let frontmatterError = null
  let body = source
  let bodyStartLine = 1

  const fmMatch = source.match(/^---\n([\s\S]*?)\n---\n?/)
  if (fmMatch) {
    body = source.slice(fmMatch[0].length)
    bodyStartLine = source.slice(0, fmMatch[0].length).split("\n").length
    try {
      frontmatter = YAML.parse(fmMatch[1])
    } catch (error) {
      frontmatterError = error instanceof Error ? error.message : String(error)
      frontmatter = null
    }
  } else if (/^﻿?---\r?\n/.test(source)) {
    frontmatterError = "未找到 Frontmatter 结束标记"
  }

  return { relativePath, source, frontmatter, frontmatterError, body, bodyStartLine }
}

function lineOfOffset(source, offset) {
  let line = 1
  let index = 0
  while (index < offset && index < source.length) {
    if (source[index] === "\n") line += 1
    index += 1
  }
  return line
}

// ---------------------------------------------------------------------------
// 链接提取（Wikilink 与 Markdown）
// ---------------------------------------------------------------------------

const WIKILINK_REGEX = /!?\[\[([^\]|#]+)?(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g
// 指向外部资源的占位文本，出现在代码示例中时不报告断链。
const PLACEHOLDER_TARGETS = new Set([
  "page",
  "文件路径",
  "图片路径",
  "frontmatter",
  "my note",
  "my note",
  "my-note",
  "video",
  "audio",
  "pdf",
  "link",
  "example",
])

function isExternalTarget(target) {
  return (
    /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target) ||
    target.startsWith("#") ||
    target.startsWith("data:")
  )
}

/**
 * 有限状态处理：逐行扫描源码，剥离 fenced code 块与 HTML 注释，在剩余文本中
 * 提取 Wikilink 与 Markdown 链接，并记录引用所在的源行号。
 */
function extractLinks(source) {
  const links = []
  const lines = source.split("\n")
  let inCodeBlock = false
  let codeFence = null
  let inHtmlComment = false

  for (let line = 1; line <= lines.length; line += 1) {
    const text = lines[line - 1]

    if (!inCodeBlock) {
      const fenceMatch = text.match(/^(\s*)(```|~~~)(.*)$/)
      if (fenceMatch) {
        inCodeBlock = true
        codeFence = fenceMatch[2]
        continue
      }
    } else {
      if (text.startsWith(codeFence)) {
        inCodeBlock = false
        codeFence = null
      }
      continue
    }

    if (inHtmlComment) {
      if (text.includes("-->")) inHtmlComment = false
      continue
    }
    if (text.includes("<!--")) {
      inHtmlComment = true
      continue
    }

    // 提取仅在非反引号片段中进行（避开行内代码，如 `[[components]]`）。
    const nonCodeSegments = text.split(/`[^`]*`/).filter((segment) => segment.trim().length > 0)
    for (const segment of nonCodeSegments) {
      // Wikilinks
      for (const match of segment.matchAll(WIKILINK_REGEX)) {
        const [raw, target, anchor] = match
        if (!target) continue
        links.push({
          kind: raw.startsWith("!") ? "embed" : "wikilink",
          target,
          anchor: anchor ?? "",
          line,
          raw,
        })
      }

      // Markdown links and images. Destination may be wrapped in `<...>`, which
      // allows parentheses (e.g. URLs); otherwise it ends at the first `)`.
      for (const prefix of segment.matchAll(/!?\[[^\]]*\]\(/g)) {
        const start = prefix.index + prefix[0].length
        let index = start
        // 跳过目的地址前的空白。
        while (index < segment.length && /\s/.test(segment[index])) index += 1
        let rawDest
        if (segment[index] === "<") {
          const close = segment.indexOf(">", index + 1)
          rawDest = close === -1 ? segment.slice(index) : segment.slice(index + 1, close)
        } else {
          rawDest = segment.slice(index).split(")", 1)[0]
        }
        const target = rawDest.trim()
        links.push({
          kind: prefix[0].startsWith("!") ? "md-image" : "md-link",
          target,
          anchor: "",
          line,
          raw: prefix[0],
        })
      }
    }
  }

  return links
}

// ---------------------------------------------------------------------------
// 页面与资源解析
// ---------------------------------------------------------------------------

function decodeTarget(target) {
  try {
    return decodeURI(target)
  } catch {
    return target
  }
}

/**
 * 将引用目标解析为候选 slug：去除锚点与查询串、URL 解码、剥离前导 "./"，
 * 再按 shortest 策略生成候选（精确匹配 + 同名后缀匹配）。
 */
function candidateSlugs(rawTarget, currentSlug) {
  const [pathPart] = rawTarget.split("#", 2)
  const withoutAnchor = pathPart.split("?", 1)[0]
  const decoded = decodeTarget(withoutAnchor)
  const direct = trimLeadingSlashes(decoded.replace(/^\.\//, ""))
  // 目录链接（如 advanced/）同时保留带斜杠与不带斜杠两种形式。
  const directoryLink = direct.endsWith("/")
  const slug = slugifyFilePath(direct)
  const candidates = new Set()

  if (!slug) return candidates
  candidates.add(slug)
  if (directoryLink) {
    const base = slug.replace(/\/$/, "")
    if (base) candidates.add(base)
  }

  // 空格形式的链接：Quartz 对 [[SPA Routing]] 会同时生成 “SPA Routing”
  // 与 “spa-routing” 两种形式的 slug，分别对应文件名与目录名。
  const unspaced = slugifyFilePath(direct.replace(/\s+/g, "-"))
  if (unspaced !== slug) candidates.add(unspaced)

  const currentDir = currentSlug.includes("/")
    ? currentSlug.slice(0, currentSlug.lastIndexOf("/"))
    : ""
  // 相对路径解析（./ 或 ../）：相对当前页面目录。
  if (/^(?:\.{1,2}\/)/.test(direct)) {
    const resolved = path.posix
      .join(currentDir || "", direct)
      .replaceAll("\\", "/")
      .replace(/^\/+/, "")
    if (resolved) candidates.add(slugifyFilePath(resolved))
  }

  // shortest：任意目录下的同名文件（裸文件名，如 [[paths]] 指向 advanced/paths）。
  const base = slug.includes("/") ? null : slug
  if (base) {
    candidates.add(base)
  }
  return candidates
}

function pageExists(slug, pageSet) {
  return pageSet.has(slug)
}

/**
 * 最短路径查找：对候选 slug 做精确匹配；若候选为裸文件名（不含 /），
 * 再匹配 pageSet 中以 `/<name>` 结尾（位于任意目录下的同名文件）的 slug。
 */
function shortestResolve(candidates, pageSet) {
  if (candidates.size === 0) return null
  for (const candidate of candidates) {
    if (pageSet.has(candidate)) return candidate
  }
  const bare = [...candidates].find((candidate) => !candidate.includes("/"))
  if (bare) {
    for (const slug of pageSet) {
      if (slug.endsWith(`/${bare}`)) return slug
    }
  }
  return null
}

/**
 * 资源目标解析为文件路径候选：解码 URL、处理前导斜杠（相对内容根）、
 * 剥离 ./ 并按当前目录解析相对路径。
 */
function resolveAssetCandidates(rawTarget, currentRelativePath, allFiles) {
  const [pathPart] = rawTarget.split("#", 2)
  const decoded = decodeTarget(pathPart.split("?", 1)[0])
  const withoutAnchor = decoded.replace(/^\.\//, "")
  const candidates = []
  const rootRelative = trimLeadingSlashes(withoutAnchor)
  candidates.push(path.posix.normalize(rootRelative))
  if (/(?:\.{1,2}\/)/.test(withoutAnchor)) {
    const currentDir = path.posix.dirname(currentRelativePath)
    const resolved = path.posix.normalize(
      path.posix.join(currentDir, withoutAnchor.replace(/^\/+/, "")),
    )
    candidates.push(resolved)
  }
  // 最短查找：裸文件名（如 quartz transform pipeline.png）在任意目录下匹配。
  const base = path.posix.normalize(rootRelative)
  if (!base.includes("/") && allFiles) {
    for (const file of allFiles) {
      if (file.endsWith(`/${base}`)) candidates.push(file)
    }
  }
  return [...new Set(candidates)]
}

// ---------------------------------------------------------------------------
// Frontmatter 状态映射（draft / unlisted / ignored）
// ---------------------------------------------------------------------------

function classifyPage(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object") return "unknown"
  if (frontmatter.draft === true || frontmatter.draft === "true") return "draft"
  if (frontmatter.unlisted === true) return "unlisted"
  return "published"
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function buildReport(rootDir) {
  const { files, directories, markdownPaths } = walkContent(rootDir)

  const slugsByPath = new Map()
  for (const relativePath of files) {
    slugsByPath.set(relativePath, slugifyFilePath(relativePath))
  }
  const pageSet = new Set([...slugsByPath.values()])
  for (const directory of directories) {
    if (directory !== "") pageSet.add(slugifyFilePath(directory))
  }
  // tags 虚拟页：所有出现过的标签生成 tags/<tag>。
  const tagSet = new Set()

  const documents = []
  const issues = []
  let linkCount = 0

  function addIssue(ruleId, level, file, line, rawTarget, description) {
    issues.push({
      ruleId,
      level,
      file,
      line,
      rawTarget: rawTarget ?? "",
      description,
    })
  }

  // Pass 1：解析 Frontmatter、收集标签、记录字段类型问题。
  for (const relativePath of markdownPaths) {
    const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8")
    const doc = parseDocument(relativePath, source)
    documents.push(doc)

    if (doc.frontmatterError) {
      addIssue(
        "frontmatter-parse-failed",
        "error",
        relativePath,
        1,
        "",
        `Frontmatter YAML 解析失败：${doc.frontmatterError}`,
      )
      continue
    }

    if (!doc.frontmatter) {
      addIssue(
        "frontmatter-missing",
        "error",
        relativePath,
        1,
        "",
        "缺少 Frontmatter（YAML 属性块）",
      )
      continue
    }

    const fm = doc.frontmatter
    const title = fm.title
    if (typeof title !== "string" || !title.trim()) {
      addIssue("title-missing", "error", relativePath, 1, "", "title 必须是非空字符串")
    }

    if (fm.tags !== undefined) {
      if (Array.isArray(fm.tags)) {
        for (const tag of fm.tags) {
          if (typeof tag === "string" && tag.trim()) tagSet.add(tag.trim())
        }
      } else {
        addIssue(
          "frontmatter-field-type",
          "warning",
          relativePath,
          1,
          "",
          `tags 字段类型不安全（${typeof fm.tags}），应为字符串数组`,
        )
      }
    }

    for (const [key, expected] of [
      ["draft", "boolean"],
      ["publish", "boolean"],
      ["unlisted", "boolean"],
    ]) {
      const value = fm[key]
      if (value === undefined) continue
      const safe =
        typeof value === "boolean" ||
        (expected === "boolean" && (value === "true" || value === "false"))
      if (!safe) {
        addIssue(
          "frontmatter-field-type",
          "warning",
          relativePath,
          1,
          "",
          `${key} 字段类型不安全（${typeof value}），应为布尔值`,
        )
      }
    }
  }

  // 虚拟标签页加入 pageSet，使指向标签页的链接不被误报。
  for (const tag of tagSet) {
    pageSet.add(`tags/${tag}`)
  }

  // Pass 2：重复 slug 检测。
  const slugToFiles = new Map()
  for (const [relativePath, slug] of slugsByPath) {
    // 只比较真正的 Markdown 源文件（relativePath 以 .md/.markdown 结尾）。
    if (!/\.(md|markdown)$/i.test(relativePath)) continue
    if (!slugToFiles.has(slug)) slugToFiles.set(slug, [])
    slugToFiles.get(slug).push(relativePath)
  }
  for (const [slug, conflicts] of slugToFiles) {
    if (conflicts.length < 2) continue
    for (const file of conflicts) {
      addIssue(
        "duplicate-slug",
        "error",
        file,
        1,
        slug,
        `多个源文件生成相同 slug ${slug}：${conflicts.map((f) => f).join("、")}`,
      )
    }
  }

  // Pass 3：先构建标题索引，再检查页面链接、资源与标题锚点。
  buildHeadingIndex(documents, slugsByPath)
  for (const doc of documents) {
    if (!doc.frontmatter) continue
    const currentSlug = slugsByPath.get(doc.relativePath)
    const links = extractLinks(doc.source)
    linkCount += links.length

    for (const link of links) {
      const rawTarget = link.target
      const trimmedTarget = rawTarget.trim()
      // 纯同页内锚点（href="#..."）合法且指向当前页面自身；外部协议链接才跳过。
      const isSamePageAnchor = trimmedTarget.startsWith("#")
      if (!isSamePageAnchor && isExternalTarget(trimmedTarget)) continue
      const isPlaceholder = PLACEHOLDER_TARGETS.has(trimmedTarget.toLowerCase())

      if (link.kind === "md-image" || link.kind === "embed") {
        // 资源检查：图片/媒体/附件引用。
        if (isPlaceholder) continue
        const ext = path.extname(trimmedTarget).toLowerCase()
        if (!ASSET_EXTENSIONS.has(ext)) continue
        const candidates = resolveAssetCandidates(trimmedTarget, doc.relativePath, files)
        const exists = candidates.some((candidate) => fs.existsSync(path.join(rootDir, candidate)))
        if (!exists) {
          addIssue(
            "asset-missing",
            "error",
            doc.relativePath,
            link.line,
            trimmedTarget,
            `本地资源不存在：${candidates.join(" 或 ")}`,
          )
        }
        continue
      }

      // 页面链接。
      if (isPlaceholder) continue
      let resolved
      if (isSamePageAnchor) {
        // 纯同页锚点指向当前页面自身。
        resolved = currentSlug
      } else {
        const candidates = candidateSlugs(trimmedTarget, currentSlug)
        resolved =
          [...candidates].find((candidate) => pageExists(candidate, pageSet)) ??
          shortestResolve(candidates, pageSet)
        if (!resolved) {
          addIssue(
            "page-link-missing",
            "error",
            doc.relativePath,
            link.line,
            trimmedTarget,
            `页面不存在：${trimmedTarget}`,
          )
          continue
        }
      }

      // 标题锚点检查（按 Quartz 实际 slug 规则）。
      const anchor = isSamePageAnchor ? trimmedTarget.slice(1) : link.anchor
      if (anchor) {
        const headingSlug = slugifyHeading(anchor.trim())
        if (!headingSlug) continue
        const headingSet = headingSlugs.get(resolved) ?? new Set()
        if (!headingSet.has(headingSlug)) {
          addIssue(
            "heading-missing",
            "error",
            doc.relativePath,
            link.line,
            anchor,
            `标题不存在：#${anchor}`,
          )
        }
      }
    }
  }

  // Pass 4：unsupported-syntax（代码块 / 行内代码中的占位符）。
  for (const doc of documents) {
    if (!doc.frontmatter) continue
    const lines = doc.source.split("\n")
    let inCodeBlock = false
    let fence = null
    for (const [index, text] of lines.entries()) {
      if (!inCodeBlock) {
        const match = text.match(/^(\s*)(```|~~~)(.*)$/)
        if (match) {
          inCodeBlock = true
          fence = match[2]
          addIssue(
            "unsupported-syntax",
            "warning",
            doc.relativePath,
            index + 1,
            "",
            `检测到 fenced code 块起始标记（${match[2]}），请确认其中没有需要解析的真实链接`,
          )
        }
      } else if (text.startsWith(fence)) {
        inCodeBlock = false
        fence = null
      }
    }
    // 行内代码占位符
    for (const [index, text] of lines.entries()) {
      if (inCodeBlock) continue
      for (const match of text.matchAll(/`([^`]+)`/g)) {
        const code = match[1].trim()
        if (PLACEHOLDER_TARGETS.has(code.toLowerCase())) {
          addIssue(
            "unsupported-syntax",
            "warning",
            doc.relativePath,
            index + 1,
            code,
            `行内代码占位符无法静态解析：${code}`,
          )
        }
      }
    }
  }

  // 汇总
  const errorCount = issues.filter((issue) => issue.level === "error").length
  const warningCount = issues.filter((issue) => issue.level === "warning").length

  // 稳定排序：相对源文件、规则 ID、行号。
  issues.sort(
    (a, b) => a.file.localeCompare(b.file) || a.ruleId.localeCompare(b.ruleId) || a.line - b.line,
  )

  return {
    schemaVersion: SCHEMA_VERSION,
    root: relativeRootPath,
    stats: {
      documents: markdownPaths.length,
      files: files.length,
      assets: files.length - markdownPaths.length,
      links: linkCount,
    },
    summary: {
      error: errorCount,
      warning: warningCount,
    },
    issues,
  }
}

// headingSlugs 需要在 Pass 3 之前构建。用闭包 Map 在主流程内填充。
const headingSlugs = new Map()

// 在 Pass 3 之前从文档正文提取标题（跳过 fenced code 块，避免误判代码中的标题）。
function buildHeadingIndex(documents, slugsByPath) {
  for (const doc of documents) {
    if (!doc.frontmatter) continue
    const slug = slugsByPath.get(doc.relativePath)
    if (!slug) continue
    const set = new Set()
    const headingRegex = /^#{1,6}\s+(.+?)\s*#*\s*$/gm
    let inCodeBlock = false
    let codeFence = null
    for (const rawLine of doc.body.split("\n")) {
      const fenceMatch = rawLine.match(/^(\s*)(```|~~~)(.*)$/)
      if (!inCodeBlock && fenceMatch) {
        inCodeBlock = true
        codeFence = fenceMatch[2]
        continue
      }
      if (inCodeBlock) {
        if (rawLine.startsWith(codeFence)) {
          inCodeBlock = false
          codeFence = null
        }
        continue
      }
      headingRegex.lastIndex = 0
      const match = headingRegex.exec(rawLine)
      if (!match) continue
      const text = match[1]
      set.add(slugifyHeading(text))
      // Obsidian 风格标题常带有编号（如 `### 2. 过滤器插件（Filters）`），
      // 而正文链接通常省略编号（如 `#过滤器插件（Filters）`）。同时注册
      // 去除编号后的形式，使两种写法都能命中同一标题。
      const deNumbered = text.replace(/^\d+[.)]\s+/, "")
      if (deNumbered !== text) set.add(slugifyHeading(deNumbered))
    }
    headingSlugs.set(slug, set)
  }
}

// ---------------------------------------------------------------------------
// CLI 参数解析
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { root: "content", format: "text", output: null }
  let index = 0
  while (index < argv.length) {
    const arg = argv[index]
    if (arg === "--root") {
      index += 1
      if (index >= argv.length) throw new ArgError("--root 缺少参数值")
      args.root = argv[index]
    } else if (arg.startsWith("--root=")) {
      args.root = arg.slice("--root=".length)
    } else if (arg === "--format") {
      index += 1
      if (index >= argv.length) throw new ArgError("--format 缺少参数值")
      const value = argv[index]
      if (value !== "text" && value !== "json") throw new ArgError("--format 只能是 text 或 json")
      args.format = value
    } else if (arg.startsWith("--format=")) {
      const value = arg.slice("--format=".length)
      if (value !== "text" && value !== "json") throw new ArgError("--format 只能是 text 或 json")
      args.format = value
    } else if (arg === "--output") {
      index += 1
      if (index >= argv.length) throw new ArgError("--output 缺少参数值")
      args.output = argv[index]
    } else if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length)
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new ArgError(`未知参数：${arg}`)
    }
    index += 1
  }

  if (args.output !== null && args.format !== "json") {
    throw new ArgError("--output 只能配合 --format json 使用")
  }
  return args
}

class ArgError extends Error {}

// ---------------------------------------------------------------------------
// 报告渲染
// ---------------------------------------------------------------------------

function renderText(report) {
  const lines = []
  if (report.summary.error === 0 && report.summary.warning === 0) {
    lines.push(
      `内容检查通过：${report.stats.documents} 个文档，${report.stats.files} 个文件，未发现 error 或 warning。`,
    )
  } else {
    lines.push(
      `内容检查发现 ${report.summary.error} 个 error、${report.summary.warning} 个 warning：`,
    )
    for (const issue of report.issues) {
      lines.push(
        `  ${issue.level} ${issue.ruleId} ${issue.file}:${issue.line} ${issue.description}`,
      )
    }
  }
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

let relativeRootPath = "content"

function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    if (error instanceof ArgError) {
      console.error(`参数错误：${error.message}`)
      console.error("用法：check:content [--root <dir>] [--format text|json] [--output <file>]")
      process.exit(2)
    }
    console.error(`参数错误：${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }

  if (args.help) {
    console.log("用法：check:content [--root <dir>] [--format text|json] [--output <file>]")
    process.exit(0)
  }

  const rootDir = path.resolve(process.cwd(), args.root)
  // 报告中的扫描根始终是相对 cwd 的 POSIX 路径，不包含机器专属绝对路径。
  relativeRootPath = path.relative(process.cwd(), rootDir).replace(/\\/g, "/") || "."

  if (!fs.existsSync(rootDir)) {
    console.error(`错误：内容目录不存在：${args.root}`)
    process.exit(2)
  }
  const stat = fs.statSync(rootDir)
  if (!stat.isDirectory()) {
    console.error(`错误：指定路径不是目录：${args.root}`)
    process.exit(2)
  }

  const report = buildReport(rootDir)

  if (args.format === "json") {
    const json = JSON.stringify(report, null, 2)
    process.stdout.write(json + "\n")
    if (args.output) {
      const outputPath = path.resolve(process.cwd(), args.output)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, json + "\n")
    }
    console.error(
      `摘要：${report.summary.error} 个 error、${report.summary.warning} 个 warning（JSON 报告已输出）`,
    )
  } else {
    console.log(renderText(report))
  }

  process.exit(report.summary.error > 0 ? 1 : 0)
}

main()
