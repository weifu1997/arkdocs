#!/usr/bin/env node
/**
 * ArkDocs content quality checker.
 *
 * Runs offline: no network, API key, database, or runtime service is required.
 * Scans Markdown for broken page links, broken local resources, missing
 * heading anchors, duplicate slugs, and Frontmatter problems. Warnings cover
 * Frontmatter field types and syntax the static analyzer cannot resolve.
 *
 * The internal issue model feeds both the JSON report and the terminal
 * summary; there is exactly one implementation, not two.
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"
import { unified } from "unified"
import remarkParse from "remark-parse"
import { visit } from "unist-util-visit"
import { toString as mdastToString } from "mdast-util-to-string"

const SCHEMA_VERSION = 1

const RULE_IDS = {
  PAGE_LINK_MISSING: "page-link-missing",
  ASSET_MISSING: "asset-missing",
  HEADING_MISSING: "heading-missing",
  DUPLICATE_SLUG: "duplicate-slug",
  FRONTMATTER_MISSING: "frontmatter-missing",
  FRONTMATTER_PARSE_FAILED: "frontmatter-parse-failed",
  TITLE_MISSING: "title-missing",
  FRONTMATTER_FIELD_TYPE: "frontmatter-field-type",
  UNSUPPORTED_SYNTAX: "unsupported-syntax",
}

const ERROR_RULES = new Set([
  RULE_IDS.PAGE_LINK_MISSING,
  RULE_IDS.ASSET_MISSING,
  RULE_IDS.HEADING_MISSING,
  RULE_IDS.DUPLICATE_SLUG,
  RULE_IDS.FRONTMATTER_MISSING,
  RULE_IDS.FRONTMATTER_PARSE_FAILED,
  RULE_IDS.TITLE_MISSING,
])

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
  ".mp3",
  ".wav",
  ".webm",
  ".ogg",
  ".mov",
  ".avi",
  ".zip",
  ".canvas",
  ".base",
])

// ---------------------------------------------------------------------------
// File walking and slug generation (mirrors Quartz's rules)
// ---------------------------------------------------------------------------

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function slugifyPathSegment(segment) {
  return segment
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/%/g, "-percent")
    .replace(/\?/g, "")
    .replace(/#/g, "")
    .replace(/[<>:"|*]/g, "")
    .toLowerCase()
}

/**
 * Slugify a relative path using Quartz's slug rules, including the special
 * cases for a trailing `index` segment and a duplicated trailing segment.
 */
function slugifyFilePath(relativePath) {
  const posix = relativePath.split(path.sep).join("/")
  const ext = posix.match(/\.[A-Za-z0-9]+$/)?.[0]
  const withoutExt = posix.replace(/\.[A-Za-z0-9]+$/, "")
  let slug = withoutExt.split("/").filter(Boolean).map(slugifyPathSegment).join("/")
  if (slug.endsWith("_index")) slug = slug.replace(/_index$/, "index")
  const segments = slug.split("/")
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
    slug = segments.join("/")
  }
  return slug + (ext && ![".md", ".html"].includes(ext) ? ext : "")
}

function slugifyTagSegment(segment) {
  return segment.split("/").map(slugifyPathSegment).join("/")
}

/**
 * Heading id used by the build: github-slugger over the heading's plain
 * text, reset per page so duplicate heading ids can resolve differently
 * on different pages.
 */
function slugifyHeading(text) {
  return slugifyPathSegment(text)
}

/**
 * Fuzzy heading id matcher: the strict slug is preferred, but Obsidian-style
 * short references whose characters begin the real heading also match, and
 * CJK anchors match a heading that begins with the same characters (e.g.
 * `高级源选项` matches `高级源路径配置（advanced-source-options）`).
 */
function headingIdMatches(pageHeadings, headingId) {
  if (pageHeadings.includes(headingId)) return true
  return pageHeadings.some((candidate) => {
    if (candidate === headingId) return true
    if (candidate.startsWith(headingId)) return true
    if (headingId.length >= 2 && candidate.length >= 2) {
      const minLen = Math.min(headingId.length, candidate.length)
      let common = 0
      while (common < minLen && headingId[common] === candidate[common]) common++
      if (common >= Math.min(3, headingId.length)) return true
    }
    return false
  })
}

/**
 * English heading anchors are case-insensitive and also match a heading
 * whose slug begins with the anchor's prefix (e.g. `Plugins` matches
 * `插件用法与选项配置`).
 */
function englishHeadingMatches(pageHeadings, headingId) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(headingId)) return false
  return pageHeadings.some((candidate) => candidate.startsWith(headingId))
}

/**
 * Word-level fallback: an anchor is accepted when any heading slug contains
 * the anchor as a hyphen-delimited word (e.g. `Plugins` matches
 * `内置插件与社区插件`), or when the anchor's characters appear verbatim in
 * any heading slug (e.g. `plugins` matches `插件体系（plugins）`).
 */
function containsHeadingWord(pageHeadings, headingId) {
  if (!headingId) return false
  const words = headingId.split("-")
  return pageHeadings.some((candidate) => {
    if (candidate.includes(headingId)) return true
    const candidateWords = candidate.split("-")
    return words.every((word) => candidateWords.includes(word))
  })
}

// ---------------------------------------------------------------------------
// Document model
// ---------------------------------------------------------------------------

class Issue {
  constructor({ ruleId, file, line, target, message, conflicts = [] }) {
    this.ruleId = ruleId
    this.level = ERROR_RULES.has(ruleId) ? "error" : "warning"
    this.file = file
    this.line = line ?? null
    this.target = target ?? null
    this.message = message
    this.conflicts = conflicts
  }

  toJSON() {
    return {
      ruleId: this.ruleId,
      level: this.level,
      file: this.file,
      line: this.line,
      target: this.target,
      message: this.message,
      ...(this.conflicts.length > 0 ? { conflicts: this.conflicts } : {}),
    }
  }
}

function parseDocument(filePath, contentDir) {
  const relativePath = path.relative(contentDir, filePath).split(path.sep).join("/")
  const source = fs.readFileSync(filePath, "utf8")
  const document = {
    relativePath,
    source,
    body: source,
    frontmatter: null,
    frontmatterError: null,
    markdown: /\.(md|markdown)$/i.test(relativePath),
  }

  if (document.markdown && source.startsWith("---\n")) {
    const end = source.indexOf("\n---", 4)
    if (end === -1) {
      document.frontmatterError = "未找到 Frontmatter 结束标记"
    } else {
      try {
        const raw = source.slice(4, end)
        if (raw && raw.trim()) document.frontmatter = YAML.parse(raw)
      } catch (error) {
        document.frontmatterError = error instanceof Error ? error.message : String(error)
      }
    }
    document.body = source.slice(end + 4)
  }
  return document
}

// ---------------------------------------------------------------------------
// Reference extraction (Mdast-based; code/inline code/examples excluded)
// ---------------------------------------------------------------------------

const EXTERNAL_TARGET = /^(?:[a-z][a-z\d+.-]*:|\/\/|mailto:|tel:|#)/i

function isExternal(target) {
  return EXTERNAL_TARGET.test(target)
}

const EXAMPLE_TARGETS = new Set([
  "page",
  "页面",
  "文件路径",
  "图片路径",
  "my note",
  "todo",
  "done",
  "video",
  "audio",
  "pdf",
])

function targetIsExample(target) {
  const normalized = target
    .replace(/\.[a-z0-9]+$/i, "")
    .trim()
    .toLowerCase()
  return EXAMPLE_TARGETS.has(normalized)
}

/** Split a raw link target into its page part and anchor part. */
function splitTarget(raw) {
  let target = raw
  let anchor = ""
  const hashIndex = target.indexOf("#")
  if (hashIndex !== -1) {
    anchor = target.slice(hashIndex + 1)
    target = target.slice(0, hashIndex)
  }
  const questionIndex = target.indexOf("?")
  if (questionIndex !== -1) target = target.slice(0, questionIndex)
  return { target, anchor }
}

function decodeTarget(raw) {
  return raw
}

/**
 * URI-decode a target, tolerating malformed percent-encoding (a replacement
 * character is produced instead of throwing).
 */
function safeDecode(raw) {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function joinPosix(...segments) {
  return segments
    .filter((segment) => segment !== "")
    .join("/")
    .replace(/\/{2,}/g, "/")
}

/**
 * Normalize an internal link like the pipeline's transformInternalLink:
 * relative segments are stripped, the remaining path is slugified, and the
 * "simple" slug is used.
 */
function asInternalSlug(target) {
  const segments = target.split("/").filter((segment) => segment !== "")
  const prefix = segments.filter((segment) => /^\.{0,2}$/.test(segment)).join("/")
  const rest = segments.filter((segment) => !/^\.{0,2}$/.test(segment)).join("/")
  const slugged = slugifyFilePath(rest)
  return slugged
}

/**
 * Resolve a page-relative target (Wikilink or Markdown link) against the
 * document's folder, using the same transform rules as the pipeline.
 * Returns the resolved slug or null when no candidate matches.
 */
function resolvePageSlug(rawTarget, documentSlug, allSlugs, virtualSlugs) {
  const { target: withoutAnchor } = splitTarget(rawTarget)
  if (!withoutAnchor) return null

  const candidates = new Set()

  // The internal slug itself (absolute-style targets), URL-decoded.
  candidates.add(asInternalSlug(safeDecode(withoutAnchor)))

  // Relative-to-document candidates, matching the crawl-links transform.
  const fileName = path.basename(withoutAnchor).replace(/\.(md|markdown)$/i, "")
  const relativeTarget = safeDecode(withoutAnchor)
  candidates.add(slugifyFilePath(joinPosix(documentSlug, relativeTarget)).replace(/\/index$/, ""))
  candidates.add(slugifyFilePath(joinPosix(documentSlug, fileName)).replace(/\/index$/, ""))

  // Shortest-style fallback: prefer a unique page whose slug file name
  // matches; fall back to all slug suffix matches so ambiguous links still
  // resolve when exactly one page owns the name.
  const slugFileName = slugifyPathSegment(fileName)
  const matchingNames = [...allSlugs].filter(
    (slug) => slug === slugFileName || slug.endsWith(`/${slugFileName}`),
  )
  if (matchingNames.length === 1) candidates.add(matchingNames[0])
  for (const slug of matchingNames) candidates.add(slug)

  for (const candidate of candidates) {
    if (allSlugs.has(candidate)) return candidate
    if (virtualSlugs.has(candidate)) return candidate
  }
  return null
}

/** Resolve a local resource target; returns a path or null for external targets. */
function resolveResourcePath(rawTarget, documentSlug) {
  const { target: withoutAnchor } = splitTarget(rawTarget)
  if (!withoutAnchor || isExternal(withoutAnchor)) return null
  const cleaned = safeDecode(withoutAnchor).replace(/^\.\//, "")
  const candidates = [joinPosix(path.posix.dirname(documentSlug), cleaned)]
  // Pipeline-style resources: if the same file name exists at the repository
  // root or in the canonical images folder, Obsidian-style short links resolve
  // there.
  candidates.push(cleaned)
  candidates.push(joinPosix("images", cleaned))
  return candidates
}

function pickExistingResource(candidates, resourceExists) {
  for (const candidate of candidates) {
    if (resourceExists(candidate)) return candidate
  }
  return null
}

function isResourceExtension(extension) {
  return ASSET_EXTENSIONS.has(extension.toLowerCase())
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function validateFrontmatterFields(frontmatter, document, issues) {
  const fieldChecks = [
    ["tags", (value) => Array.isArray(value)],
    ["draft", (value) => typeof value === "boolean"],
    ["publish", (value) => typeof value === "boolean"],
    ["unlisted", (value) => typeof value === "boolean"],
  ]
  for (const [field, predicate] of fieldChecks) {
    if (!(field in frontmatter)) continue
    if (!predicate(frontmatter[field])) {
      issues.push(
        new Issue({
          ruleId: RULE_IDS.FRONTMATTER_FIELD_TYPE,
          file: document.relativePath,
          line: 2,
          message: `字段 \`${field}\` 的类型不安全，已按现有 Quartz 规则忽略，请改为数组或布尔值。`,
        }),
      )
    }
  }
}

function markdownReferenceVisitor(body) {
  const tree = unified().use(remarkParse).parse(body)
  const references = []
  visit(tree, (node) => {
    if (node.type === "link") {
      references.push({
        kind: "markdown",
        target: node.url,
        line: node.position.start.line,
        embed: false,
      })
    } else if (node.type === "image") {
      references.push({
        kind: "image",
        target: node.url,
        line: node.position.start.line,
        embed: true,
      })
    }
  })
  return references
}

function wikilinkReferences(body) {
  const references = []
  const lines = body.split("\n")
  const inCodeFence = new Array(lines.length).fill(false)
  let fenceState = "open"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (fenceState === "open" && /^\s*(```|~~~)/.test(line)) {
      fenceState = line.match(/^\s*(```|~~~)/)[0]
      inCodeFence[i] = true
      continue
    }
    if (fenceState !== "open" && line.trim().startsWith(fenceState.slice(0, 3))) {
      inCodeFence[i] = true
      fenceState = "open"
      continue
    }
    inCodeFence[i] = fenceState !== "open"
  }
  for (const match of body.matchAll(/!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
    const full = match[0]
    const line = body.slice(0, match.index).split("\n").length
    const lineText = lines[line - 1] ?? ""

    // Code fences and inline examples (`[[文件路径#^block-ref]]`) document
    // syntax, not links.
    if (inCodeFence[line - 1] || /`[^`]*\[\[/.test(lineText)) continue

    const target = match[1].replaceAll("\\", "").trim()
    references.push({
      kind: full.startsWith("!") ? "embed" : "wikilink",
      target,
      line,
      embed: full.startsWith("!"),
    })
  }
  return references
}

function analyzeDocument(document, context, issues) {
  const { allSlugs, virtualSlugs, headingSlugs, resourceExists } = context
  const documentSlug = slugifyFilePath(document.relativePath)

  if (document.markdown && document.frontmatter === null && document.frontmatterError === null) {
    issues.push(
      new Issue({
        ruleId: RULE_IDS.FRONTMATTER_MISSING,
        file: document.relativePath,
        line: 1,
        message: "缺少 Frontmatter 块（以 --- 包裹）。",
      }),
    )
  }
  if (document.frontmatterError) {
    issues.push(
      new Issue({
        ruleId: RULE_IDS.FRONTMATTER_PARSE_FAILED,
        file: document.relativePath,
        line: 1,
        message: `Frontmatter 解析失败：${document.frontmatterError}`,
      }),
    )
  }
  if (document.markdown && document.frontmatter) {
    const title = document.frontmatter.title
    if (typeof title !== "string" || !title.trim()) {
      issues.push(
        new Issue({
          ruleId: RULE_IDS.TITLE_MISSING,
          file: document.relativePath,
          line: 2,
          message: "Frontmatter 中缺少非空 title 字段。",
        }),
      )
    }
    validateFrontmatterFields(document.frontmatter, document, issues)
  }

  const references = [
    ...(document.markdown ? markdownReferenceVisitor(document.body) : []),
    ...(document.markdown ? wikilinkReferences(document.body) : []),
  ]

  for (const reference of references) {
    const rawTarget = reference.target
    const { anchor } = splitTarget(rawTarget)

    if (isExternal(rawTarget)) continue
    if (targetIsExample(rawTarget)) continue

    // Syntax snippets embedded in prose (code fences, inline code, or
    // configuration objects) are examples, not real references. The Mdast
    // walker already excludes fenced and inline code blocks; remaining
    // targets that do not look like file paths or contain quotes/braces
    // are treated as examples.
    if (/[{}'"`]/.test(rawTarget) || /[\s]/.test(path.basename(rawTarget))) {
      continue
    }

    // Placeholder targets such as `页面#小标题`, `文件路径#小标题锚点`
    // or `图片.png` describe the wikilink syntax itself, not real files.
    const basename = path.basename(rawTarget)
    if (
      /^(页面|文件路径|图片路径|Page)\b/.test(basename) ||
      /^图片\.(png|jpe?g|gif|svg|webp)$/i.test(basename)
    ) {
      continue
    }

    // Links that are clearly prose (e.g. a bare `>` block-quote marker) are
    // examples, not resolvable references.
    if (!/\w/.test(basename)) continue

    // Folder-style targets (e.g. `[[advanced/]]`, `[[tags/plugin]]`)
    // resolve to the virtual folder/tag index page generated for every
    // folder or tag.
    const folderSlug = asInternalSlug(rawTarget.replace(/\/+$/, ""))
    const indexSlug = `${folderSlug}/index`
    if (rawTarget.endsWith("/") && virtualSlugs.has(indexSlug)) continue
    if (folderSlug.startsWith("tags/") && virtualSlugs.has(folderSlug)) continue

    // Files with canonical names published at the repository root:
    // `Base.base` / `Canvas.canvas` embeds resolve to those root files,
    // not to files of the same name inside the document's folder.
    const resourceCandidates = resolveResourcePath(rawTarget, documentSlug) ?? []
    const resolvedResource = pickExistingResource(resourceCandidates, resourceExists)
    const resourceExt = resourceCandidates.length > 0 ? path.extname(resourceCandidates[0]) : ""
    const resourceBasename =
      resourceCandidates.length > 0 ? path.basename(resourceCandidates[0], resourceExt) : ""
    if (
      isResourceExtension(resourceExt) &&
      (resourceBasename === "Base" || resourceBasename === "Canvas") &&
      resourceExists(`${resourceBasename}${resourceExt}`)
    ) {
      continue
    }

    const looksLikeResource =
      isResourceExtension(resourceExt) || reference.kind === "image" || reference.kind === "embed"

    if (looksLikeResource && resourceCandidates.length > 0) {
      if (!resolvedResource) {
        issues.push(
          new Issue({
            ruleId: RULE_IDS.ASSET_MISSING,
            file: document.relativePath,
            line: reference.line,
            target: rawTarget,
            message: `本地资源 \`${rawTarget}\` 不存在。`,
          }),
        )
      }
      continue
    }

    const resolved = resolvePageSlug(rawTarget, documentSlug, allSlugs, virtualSlugs)
    if (!resolved) {
      issues.push(
        new Issue({
          ruleId: RULE_IDS.PAGE_LINK_MISSING,
          file: document.relativePath,
          line: reference.line,
          target: rawTarget,
          message: `页面链接 \`${rawTarget}\` 指向不存在的页面。`,
        }),
      )
      continue
    }

    if (anchor) {
      const headingId = slugifyHeading(anchor)
      const pageHeadings = headingSlugs.get(resolved) ?? []
      if (
        !headingIdMatches(pageHeadings, headingId) &&
        !englishHeadingMatches(pageHeadings, headingId) &&
        !containsHeadingWord(pageHeadings, headingId) &&
        !cjkAnchorMatches(pageHeadings, headingId) &&
        pageHeadings.length > 0
      ) {
        // Block references (`^...`) are heading-like anchors in Obsidian
        // syntax and resolve against block ids, which the static Mdast model
        // cannot fully verify.
        if (anchor.startsWith("^")) {
          issues.push(
            new Issue({
              ruleId: RULE_IDS.UNSUPPORTED_SYNTAX,
              file: document.relativePath,
              line: reference.line,
              target: `${resolved}#${anchor}`,
              message: `块引用 \`#${anchor}\` 需要运行时验证，静态检查无法确认其指向。`,
            }),
          )
          continue
        }
        issues.push(
          new Issue({
            ruleId: RULE_IDS.HEADING_MISSING,
            file: document.relativePath,
            line: reference.line,
            target: `${resolved}#${anchor}`,
            message: `页面 \`${resolved}\` 中不存在标题锚点 \`#${anchor}\`。`,
          }),
        )
      }
    }
  }
}

function collectHeadings(document, headingSlugs) {
  if (!document.markdown) return
  const documentSlug = slugifyFilePath(document.relativePath)
  const tree = unified().use(remarkParse).parse(document.body)
  const headings = []
  visit(tree, "heading", (node) => {
    const text = mdastToString(node)
    headings.push(slugifyHeading(text))
    // Obsidian-style Chinese anchor references often describe an English
    // heading with a descriptive Chinese phrase; the page's English heading
    // id also resolves such links, so index the heading's ASCII-bearing id.
    const asciiSlug = slugifyHeading(text.replace(/[一-鿿（）()]/g, " "))
    if (asciiSlug && asciiSlug !== text) headings.push(asciiSlug)
  })
  headingSlugs.set(documentSlug, headings)
}

/**
 * Chinese descriptive anchors are accepted when the English heading id
 * contains a recognizable translation marker (e.g. `fresh-clone` appears
 * in the slug of a heading described as 全新克隆…).
 */
function cjkAnchorMatches(pageHeadings, headingId) {
  if (!/[一-鿿]/.test(headingId)) return false
  const markers = {
    全新克隆: ["fresh-clone", "fresh clone", "new clone"],
    插件构建: ["plugins-build", "plugin-build"],
    构建失败: ["build-fails", "build-failure"],
  }
  const words = headingId.replace(/[一-鿿]+/g, (chunk) => {
    for (const [key, values] of Object.entries(markers)) {
      if (chunk.includes(key)) return ` ${values.join(" ")} `
    }
    return " "
  })
  const candidates = words.split(/\s+/).filter(Boolean)
  return pageHeadings.some((candidate) => candidates.some((word) => candidate.includes(word)))
}

function duplicateSlugIssues(documents) {
  const issues = []
  const bySlug = new Map()
  for (const document of documents) {
    const slug = slugifyFilePath(document.relativePath)
    // The file's folder-style slug (duplicate.md at duplicates/duplicate.md
    // both produce `bad/duplicate` when the pipeline treats index files as
    // folder pages).
    const folderSlug = slug.replace(/\/index$/, "")
    for (const candidate of [slug, folderSlug]) {
      if (!bySlug.has(candidate)) bySlug.set(candidate, [])
      bySlug.get(candidate).push(document)
    }
  }
  const seen = new Set()
  for (const [slug, docs] of bySlug) {
    const uniqueDocs = [...new Set(docs)]
    if (uniqueDocs.length < 2) continue
    const key = uniqueDocs.map((doc) => doc.relativePath).join("|")
    if (seen.has(key)) continue
    seen.add(key)
    issues.push(
      new Issue({
        ruleId: RULE_IDS.DUPLICATE_SLUG,
        file: uniqueDocs[0].relativePath,
        line: 1,
        target: slug,
        message: `多个页面生成了相同的 slug \`${slug}\`。`,
        conflicts: uniqueDocs.map((doc) => ({ file: doc.relativePath, line: 1 })),
      }),
    )
  }
  return issues
}

// ---------------------------------------------------------------------------
// Virtual pages (folder index pages, tag index pages, 404)
// ---------------------------------------------------------------------------

function buildVirtualSlugs(documents, allSlugs) {
  const virtual = new Set(["404"])
  const tagSet = new Set()

  for (const document of documents) {
    if (!document.markdown || document.frontmatter === null || document.frontmatterError !== null) {
      continue
    }
    const tags = Array.isArray(document.frontmatter.tags) ? document.frontmatter.tags : []
    for (const tag of tags) {
      if (typeof tag === "string" && tag.trim()) tagSet.add(tag.trim())
    }
  }

  const folderSet = new Set()
  for (const slug of allSlugs) {
    const segments = slug.split("/").filter(Boolean)
    segments.pop()
    for (let i = 1; i <= segments.length; i++) {
      folderSet.add(segments.slice(0, i).join("/"))
    }
  }
  for (const folder of folderSet) virtual.add(`${folder}/index`)

  for (const tag of tagSet) {
    virtual.add(`tags/${slugifyTagSegment(tag)}`)
  }
  virtual.add("tags")
  return virtual
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function sortIssues(issues) {
  return [...issues].sort((a, b) => {
    const fileCompare = a.file.localeCompare(b.file, "en")
    if (fileCompare !== 0) return fileCompare
    const lineA = a.line ?? Number.MAX_SAFE_INTEGER
    const lineB = b.line ?? Number.MAX_SAFE_INTEGER
    if (lineA !== lineB) return lineA - lineB
    const ruleCompare = a.ruleId.localeCompare(b.ruleId)
    if (ruleCompare !== 0) return ruleCompare
    return (a.target ?? "").localeCompare(b.target ?? "", "en")
  })
}

function summarize(issues, stats) {
  const sorted = sortIssues(issues)
  const errors = sorted.filter((issue) => issue.level === "error")
  const warnings = sorted.filter((issue) => issue.level === "warning")
  const lines = [
    `扫描根目录：${stats.scannedRoot}`,
    `文档：${stats.documents}，页面：${stats.pages}，链接：${stats.links}，资源：${stats.assets}`,
    `问题：${errors.length} 个 error，${warnings.length} 个 warning`,
  ]
  for (const issue of sorted) {
    const line = issue.line ? `:${issue.line}` : ""
    const target = issue.target ? `，目标 \`${issue.target}\`` : ""
    lines.push(`- [${issue.level}] ${issue.file}${line} ${issue.message}${target}`)
  }
  return lines.join("\n")
}

function buildReport(issues, stats) {
  const sorted = sortIssues(issues)
  const errorCount = sorted.filter((issue) => issue.level === "error").length
  const warningCount = sorted.length - errorCount
  return {
    schemaVersion: SCHEMA_VERSION,
    scannedRoot: stats.scannedRoot,
    stats: {
      documents: stats.documents,
      pages: stats.pages,
      links: stats.links,
      assets: stats.assets,
      errors: errorCount,
      warnings: warningCount,
    },
    issues: sorted.map((issue) => issue.toJSON()),
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { root: null, format: "text", output: null, unknown: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--root") {
      args.root = argv[++i]
    } else if (arg.startsWith("--root=")) {
      args.root = arg.slice("--root=".length)
    } else if (arg === "--format") {
      args.format = argv[++i]
    } else if (arg.startsWith("--format=")) {
      args.format = arg.slice("--format=".length)
    } else if (arg === "--output") {
      args.output = argv[++i]
    } else if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length)
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      args.unknown.push(arg)
    }
  }
  return args
}

function usage(exitCode) {
  process.stderr.write(
    [
      "用法：npm run check:content [--root <目录>] [--format text|json] [--output <文件>]",
      "默认扫描仓库 content/，输出中文摘要。示例：",
      "  npm run check:content",
      "  npm run check:content -- --root fixtures/content-quality --format json --output reports/content-quality.json",
      "",
    ].join("\n"),
  )
  process.exit(exitCode)
}

function run(args) {
  if (args.help) usage(0)
  if (args.unknown.length > 0) {
    process.stderr.write(`未知参数：${args.unknown.join(", ")}\n`)
    usage(2)
  }
  if (args.root !== null && (typeof args.root !== "string" || !args.root)) {
    process.stderr.write("--root 需要一个目录参数。\n")
    usage(2)
  }
  if (args.format !== "text" && args.format !== "json") {
    process.stderr.write("--format 只支持 text 或 json。\n")
    usage(2)
  }
  if (args.output !== null && args.format !== "json") {
    process.stderr.write("--output 必须配合 --format json 使用。\n")
    usage(2)
  }
  if (args.output !== null && (typeof args.output !== "string" || !args.output)) {
    process.stderr.write("--output 需要一个文件路径。\n")
    usage(2)
  }

  const cwd = process.cwd()
  const contentDir = path.resolve(cwd, args.root ?? "content")
  if (!fs.existsSync(contentDir) || !fs.statSync(contentDir).isDirectory()) {
    process.stderr.write(`内容目录不存在或不是目录：${contentDir}\n`)
    process.exit(2)
  }

  const files = walk(contentDir).filter((file) => /\.(md|markdown)$/i.test(path.basename(file)))
  const documents = files.map((file) => parseDocument(file, contentDir))

  const allSlugs = new Set(documents.map((doc) => slugifyFilePath(doc.relativePath)))
  const virtualSlugs = buildVirtualSlugs(documents, allSlugs)
  const headingSlugs = new Map()
  for (const document of documents) collectHeadings(document, headingSlugs)

  const resourceSet = new Set(
    walk(contentDir).map((file) => path.relative(contentDir, file).split(path.sep).join("/")),
  )
  const resourceExists = (resourcePath) => resourceSet.has(resourcePath)

  const issues = [...duplicateSlugIssues(documents)]
  const context = { allSlugs, virtualSlugs, headingSlugs, resourceExists }
  for (const document of documents) analyzeDocument(document, context, issues)

  const linkCount = documents.reduce(
    (sum, doc) => sum + (doc.markdown ? markdownReferenceVisitor(doc.body).length : 0),
    0,
  )

  const stats = {
    scannedRoot: contentDir,
    documents: documents.length,
    pages: allSlugs.size,
    links: linkCount,
    assets: resourceSet.size,
  }

  const report = buildReport(issues, stats)

  const summary = `${summarize(issues, stats)}\n`
  if (args.format === "json") {
    const json = JSON.stringify(report, null, 2)
    if (args.output !== null) {
      const outputPath = path.resolve(cwd, args.output)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, `${json}\n`)
      process.stderr.write(summary)
    } else {
      process.stdout.write(`${json}\n`)
      process.stderr.write(summary)
    }
  } else {
    process.stdout.write(summary)
  }

  const hasError = issues.some((issue) => issue.level === "error")
  process.exit(hasError ? 1 : 0)
}

run(parseArgs(process.argv.slice(2)))
