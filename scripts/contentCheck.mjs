/**
 * ArkDocs 作者本地内容质量检查的规则引擎（纯 Node ESM，无 TS 编译依赖）。
 *
 * 被 `scripts/check-content.mjs` CLI 和 `test/content-quality/` 测试套件复用。
 * 所有路径都是相对于扫描根目录的 POSIX 相对路径；每条问题带稳定排序键，
 * JSON 报告因此字节级确定性。
 *
 * 固定规则与严重级别：
 *  - page-link-missing         error  页面链接/锚点指向不存在的页面
 *  - asset-missing             error  本地媒体资源（图片/视频/PDF 等）不存在
 *  - heading-missing           error  标题锚点在目标页面上不存在
 *  - duplicate-slug            error  多个源文件生成相同 slug
 *  - frontmatter-missing       error  文件缺少有效的 YAML frontmatter
 *  - frontmatter-parse-failed  error  YAML 块解析失败
 *  - title-missing             error  frontmatter 缺少非空 title
 *  - frontmatter-field-type   warning tags/draft/publish/unlisted 类型不安全
 *  - unsupported-syntax       warning  无法静态判定的 Markdown 结构
 *
 * 外部 URL、代码块（围栏/行内）和明确的文档示例占位符被忽略。
 */

import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"

/* ----------------------------------------------------------------------- */
/* Slug + heading helpers（镜像 @quartz-community/utils 与 Quartz 标题规则） */
/* ----------------------------------------------------------------------- */

/** 镜像 @quartz-community/utils `slugifyPath` 的单段转换。 */
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

/**
 * Slugify 整个文件路径（含 .md/.markdown 扩展名）。
 * 镜像 `@quartz-community/utils.slugifyFilePath`：逐段 slugify，最后两段相同时改为 index。
 */
export function slugifyFilePath(relativePath) {
  const cleaned = relativePath.replace(/\\/g, "/").replace(/^\.?\/+/, "")
  const withoutExt = cleaned.replace(/\.(md|markdown)$/i, "")
  const segments = withoutExt
    .split("/")
    .filter((s) => s.length > 0)
    .map(slugifySegment)
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
  }
  return segments.join("/")
}

/** GitHub 标题 slugger（Quartz 标题锚点使用）：移除标点，空格转连字符。 */
export function slugHeading(text) {
  const lowered = text
    .trim()
    .toLowerCase()
    // Strip blockquote/heading emphasis markers: trailing #, leading '>', and
    // bold/italic wrappers around heading text, e.g. "# Plugin **(Filters)**".
    .replace(/\s+#+\s*$/, "")
    .replace(/^\s*>\s*/, "")
    // Remove an Obsidian callout block (`> [!note] 提示`) which is part of the
    // heading line in some real pages.
    .replace(/^\[!\w+\]/, "")
  return lowered.replace(/[^\w一-鿿\s-]+/giu, "").replace(/\s+/g, "-")
}

export function slugifyAnchor(anchor) {
  return slugHeading(anchor)
}

/** 规范化 frontmatter tags（数组或标量）为小写去重列表。 */
export function normalizeTagValue(value) {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTagValue(item)).filter((tag) => tag.length > 0)
  }
  const tag = String(value).trim().toLowerCase()
  return tag.length > 0 ? [tag] : []
}

/* ----------------------------------------------------------------------- */
/* 链接/代码/资源抽取                                                       */
/* ----------------------------------------------------------------------- */

const ASSET_EXTENSIONS =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|mp4|mp3|wav|webm|ogg|mov|avi|mkv|pdf)$/i

// Obsidian canvas/base transclusion targets (not ordinary media). These resolve
// to real files at the repo root / content root in most setups and are copied
// by Quartz as static assets; checking their existence adds noise for a
// markdown-link checker, so they are treated like asset references.
const CANVAS_BASE_EXTENSIONS = /\.(canvas|base)$/i

const INLINE_CODE_RE = /`[^`]+`/g
// Wikilink/embed targets exclude ], |, #, and backslash. An optional alias
// after the target (a plain `|`, an escaped `\|`, or an escaped `#`) is
// handled by the caller (it strips the alias/escape).
const WIKI_EMBED_RE = /!\[\[([^\]|#\\]*)(?:#[^\]|#\\]*)*(?:(?:\\|\|)[^\]]*)?\]\]/g
const WIKI_LINK_RE = /\[\[([^\]|#\\]*)(?:#[^\]|#\\]*)*(?:(?:\\|\|)[^\]]*)?\]\]/g
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g
const MD_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

// 明确的文档示例占位符（在真实 Quartz 文档中观察到），它们是链接的说明，
// 永远不应被检查。中文“页面”是 Obsidian 链接语法示例（如 [[页面]]），
// 英文 link 是 HTML/Markdown 模板示例（如 [name](link)）。
const PLACEHOLDER_RE =
  /^(?:Page|TODO|DONE|My Note|my note|MY NOTE|MyLink|Page 2|test|file path|图片路径|路径|链接|页面|link)$/i
// 行内代码用反引号引用的“伪链接”（如 `[[also-not-checked]]`、`[[broken-link]]`）
// 只出现在代码中，不参与真实链接检查。
const INLINE_SNIPPET_RE = /[a-z0-9-]/i

function stripCodeBlocks(source) {
  // Process lines top to bottom: an opener is a line made only of fence
  // characters, optionally prefixed by up to 3 spaces, a '>' blockquote
  // prefix, and/or a language tag / info string. A matching close is a line
  // with the same fence characters, same prefix rules.
  const lines = source.split("\n")
  const out = []
  let unclosed = false
  let inFence = false
  let fenceChars = ""
  for (const line of lines) {
    const openerMatch = /^(\s{0,3}(?:>\s*)?)(`{3,}|~{3,})([^\s`~]*)\s*$/.exec(line)
    if (inFence) {
      const closeRe = new RegExp(
        `^\\s{0,3}(?:>\\s*)?${fenceChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
      )
      const closeMatch = closeRe.exec(line)
      if (closeMatch) {
        inFence = false
        // Keep the closing fence line (no links) so line numbers stay aligned.
        out.push("")
      } else {
        // Fence content: blank out the whole line so links inside a code block
        // are never extracted. The newline is preserved for accurate line
        // numbers.
        out.push("")
      }
      continue
    }
    if (openerMatch && (openerMatch[3].length > 0 || openerMatch[2].length > 3)) {
      inFence = true
      fenceChars = openerMatch[2]
      out.push("")
      continue
    }
    out.push(line)
  }
  if (inFence) unclosed = true
  // Strip HTML comments so template placeholders inside them are never checked,
  // and collapse inline code per line (an unpaired backtick cannot swallow
  // subsequent content).
  const body = out
    .map((line) => line.replace(/<!--[\s\S]*?-->/g, "").replace(INLINE_CODE_RE, ""))
    .join("\n")
  return { body, unclosed }
}

/**
 * Whether a wikilink/link target is an explicit documentation placeholder
 * (the link illustrates syntax rather than references a page). Maintained
 * against real Quartz docs: English `Page`, `TODO`, `link`, `test`, and the
 * Chinese examples “页面”/“链接”.
 */
function isPlaceholder(target) {
  const stripped = target.split("#")[0].trim()
  return PLACEHOLDER_RE.test(stripped)
}

/**
 * Whether the match text (the whole wikilink/link, including the preceding
 * backtick) is wrapped in inline code — i.e. its opening `}` is preceded by an
 * odd number of backticks on the same line. Such `[[also-not-checked]]` snippets
 * are documentation examples, not real links.
 */
function isInlineCodeMatch(fullLine, openIndex) {
  const line = fullLine
  const before = line.slice(0, openIndex)
  const backtickCount = (before.match(/`/g) || []).length
  return backtickCount % 2 === 1
}

/** 解析 wikilink/markdown 链接目标为规范页面 slug。 */
function resolvePageSlug(target, currentSlug, allSlugs) {
  const [rawPath, rawAnchor] = target.split("#", 2)
  let decoded
  try {
    decoded = decodeURIComponent(rawPath ?? "")
  } catch {
    return { slug: null, anchor: null }
  }
  decoded = decoded.replace(/^\.\//, "").replace(/^\.?\/+/, "")
  const withoutExt = decoded.replace(/\.(md|markdown)$/i, "")

  // Obsidian “最短名称”解析（镜像 @quartz-community/utils `transformLink`
  // 的 shortest 策略）：对最后一段文件名进行匹配——先对文件名做与页面
  // 路径相同的 slugify（大小写归一、空格转连字符），再匹配最后一段同名、
  // 或以该名结尾的页面。多个同名匹配时回退到规范相对路径（真实构建行
  // 为），不报误报；完全没有同名页面才视为失效链接。
  const targetRawName = withoutExt.split("/").pop()
  const targetName = targetRawName ? slugifySegment(targetRawName) : ""
  if (targetName) {
    const matches = []
    for (const s of allSlugs.keys()) {
      const name = s.split("/").pop()
      if (name === targetName || s.endsWith("/" + targetName)) matches.push(s)
    }
    if (matches.length > 0) {
      // Resolve an ambiguous shortest-name match (e.g. bare [[index]] against
      // both the site root `index` page and a folder `…/index` page): if an
      // anchor is given, pick the match whose heading set contains a slug
      // matching it; otherwise prefer the exact same-name slug (`index`) over
      // nested `/index` folder pages.
      if (rawAnchor) {
        const wanted = slugifyAnchor(rawAnchor)
        const best = matches.find((s) => allSlugs.get(s)?.anchorSet.has(wanted))
        if (best) return { slug: best, anchor: rawAnchor ?? null }
      }
      const exact = matches.find((s) => s === targetName)
      return { slug: exact ?? matches[0], anchor: rawAnchor ?? null }
    }
  }

  // Obsidian 文件夹链接（以 / 结尾，如 advanced/）指向对应文件夹的
  // index 页。
  if (withoutExt.endsWith("/")) {
    const folderSlug = withoutExt.replace(/\//g, "")
    const indexCandidate =
      (path.posix.dirname(currentSlug) + "/" + folderSlug).replace(/^\.?\/+/, "") + "/index"
    const absCandidate = folderSlug ? folderSlug + "/index" : "index"
    for (const candidate of [indexCandidate, absCandidate]) {
      if (allSlugs.has(candidate)) {
        return { slug: candidate, anchor: rawAnchor ?? null }
      }
    }
    return { slug: null, anchor: rawAnchor ?? null }
  }

  // 显式多段路径（如 configuration 或 features/full-text search）：按相对
  // 当前页面或站点绝对路径解析。
  const rel = decoded.startsWith("/")
    ? decoded.slice(1).replace(/^\.?\/+/, "")
    : path.posix.join(path.posix.dirname(currentSlug), withoutExt).replace(/^\.?\/+/, "")
  const candidates = new Set([rel])
  const resolved = [...candidates].find((c) => allSlugs.has(c))
  if (!resolved) {
    const indexCandidate = rel + "/index"
    if (allSlugs.has(indexCandidate)) {
      return { slug: indexCandidate, anchor: rawAnchor ?? null }
    }
    return { slug: null, anchor: rawAnchor ?? null }
  }
  return { slug: resolved, anchor: rawAnchor ?? null }
}

/* ----------------------------------------------------------------------- */
/* 主检查                                                                   */
/* ----------------------------------------------------------------------- */

export function runContentCheck(options) {
  const { root } = options
  const issues = []
  const stats = {
    documents: 0,
    slugs: 0,
    assets: 0,
    links: 0,
    errors: 0,
    warnings: 0,
  }

  if (!fs.existsSync(root)) {
    issues.push({
      ruleId: "cli-error",
      level: "error",
      file: "",
      message: `扫描根目录不存在：${root}`,
    })
    stats.errors++
    return { issues, stats, scanRoot: root }
  }

  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else files.push(full)
    }
  }
  walk(root)

  const markdownFiles = files.filter((f) => /\.(md|markdown)$/i.test(f))
  const referencedAssets = new Set()
  // Known asset files resolved against the content root, used to resolve bare
  // asset names by Obsidian shortest-name semantics.
  const assetDepths = new Set()
  const docs = []

  // Collect every existing asset file (non-md, copied by Quartz) up front so
  // bare embed names can resolve at their on-disk depth.
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join("/")
    if (
      /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|mp3|wav|webm|ogg|mov|avi|mkv|pdf|canvas|base)$/i.test(
        rel,
      )
    ) {
      assetDepths.add(rel)
    }
  }

  // Pass 1：读取、解析 frontmatter、slug、tags。
  const anchorsBySlug = new Map()

  for (const abs of markdownFiles) {
    const fileRel = path.relative(root, abs).split(path.sep).join("/")
    stats.documents++
    let raw
    try {
      raw = fs.readFileSync(abs, "utf8")
    } catch {
      continue
    }
    let fmEnd = 0
    let frontmatter = null
    let title = ""
    let titleLine = 0
    const tags = []

    if (!raw.startsWith("---\n")) {
      issues.push({
        ruleId: "frontmatter-missing",
        level: "error",
        file: fileRel,
        line: 1,
        message: "缺少 Frontmatter（文件必须以 --- 开始）",
      })
      stats.errors++
      continue
    }
    const end = raw.indexOf("\n---", 4)
    if (end === -1) {
      issues.push({
        ruleId: "frontmatter-parse-failed",
        level: "error",
        file: fileRel,
        line: 1,
        message: "未找到 Frontmatter 结束标记（---）",
      })
      stats.errors++
      continue
    }
    const rawFm = raw.slice(4, end)
    fmEnd = end + 4
    try {
      frontmatter = YAML.parse(rawFm)
    } catch (e) {
      issues.push({
        ruleId: "frontmatter-parse-failed",
        level: "error",
        file: fileRel,
        line: 2,
        message: `Frontmatter 解析失败：${e instanceof Error ? e.message : String(e)}`,
      })
      stats.errors++
      continue
    }
    if (frontmatter === null || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
      issues.push({
        ruleId: "frontmatter-missing",
        level: "error",
        file: fileRel,
        line: 2,
        message: "Frontmatter 必须是 YAML 对象",
      })
      stats.errors++
      continue
    }
    const fm = frontmatter

    if (typeof fm.title !== "string" || !fm.title.trim()) {
      issues.push({
        ruleId: "title-missing",
        level: "error",
        file: fileRel,
        line: 2,
        message: "缺少非空字符串的 title 字段",
      })
      stats.errors++
    } else {
      title = fm.title.trim()
    }

    if (fm.tags !== undefined && !Array.isArray(fm.tags)) {
      issues.push({
        ruleId: "frontmatter-field-type",
        level: "warning",
        file: fileRel,
        line: 2,
        message: "tags 字段应为数组",
      })
      stats.warnings++
    }
    if (fm.draft !== undefined && typeof fm.draft !== "boolean") {
      issues.push({
        ruleId: "frontmatter-field-type",
        level: "warning",
        file: fileRel,
        line: 2,
        message: "draft 字段应为布尔值",
      })
      stats.warnings++
    }
    if (fm.publish !== undefined && typeof fm.publish !== "boolean") {
      issues.push({
        ruleId: "frontmatter-field-type",
        level: "warning",
        file: fileRel,
        line: 2,
        message: "publish 字段应为布尔值",
      })
      stats.warnings++
    }
    if (fm.unlisted !== undefined && typeof fm.unlisted !== "boolean") {
      issues.push({
        ruleId: "frontmatter-field-type",
        level: "warning",
        file: fileRel,
        line: 2,
        message: "unlisted 字段应为布尔值",
      })
      stats.warnings++
    }

    tags.push(...normalizeTagValue(fm.tags))

    const fmLines = raw.slice(0, end).split("\n")
    for (let i = 0; i < fmLines.length; i++) {
      if (/^\s*title\s*:/.test(fmLines[i])) {
        titleLine = i + 1
        break
      }
    }

    const slug = slugifyFilePath(fileRel)
    docs.push({ fileRel, frontmatter: fm, raw, fmEnd, title, tags, line: titleLine })
    anchorsBySlug.set(slug, new Set())
  }

  // Pass 1.5：从标题构建锚点集合。标题文本按 GitHub slugger 规则转换，
  // 并额外归一化 Obsidian 标题标记（去掉尾 #、HTML 标签、引用块前缀等），
  // 使其与 [[页面#标题]] 中解析出的锚点使用同一规则。
  for (const doc of docs) {
    const slug = slugifyFilePath(doc.fileRel)
    const set = anchorsBySlug.get(slug)
    if (!set) continue
    const rawBody = doc.raw.slice(doc.fmEnd)
    const stripped = stripCodeBlocks(rawBody).body
    const lines = stripped.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const m = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line)
      if (m) {
        let headingText = m[1]
        // 去掉行内 HTML 标签、强调标记、尾 #，以及行内代码。
        headingText = headingText
          .replace(/<[^>]+>/g, " ")
          .replace(/\*+/g, "")
          .replace(/`+/g, "")
          .replace(/^\d+[.)、)]\s*/, "")
          .replace(/\s#+\s*$/, "")
          .trim()
        set.add(slugifyAnchor(headingText))
      }
    }
  }

  // Pass 2：重复 slug。Quartz 的“文件夹笔记”约定：X.md 与 X/index.md 都服务于
  // 同一个 X 页面（simplifySlug 会去掉 /index），因此它们若同时存在就会写
  // 同一份 index.html，属于跨平台的 slug 冲突（区别于大小写敏感的
  // Note.md/note.md）。对每个文件取“简化 slug”：末尾 /index 去掉后再比较。
  const slugFiles = new Map()
  for (const doc of docs) {
    const raw = slugifyFilePath(doc.fileRel)
    const simplified = raw.replace(/\/index$/, "")
    const key = simplified
    const list = slugFiles.get(key) || []
    list.push({ file: doc.fileRel, line: doc.line, rawSlug: raw })
    slugFiles.set(key, list)
  }
  for (const [slug, files] of slugFiles) {
    if (files.length > 1) {
      for (const f of files) {
        issues.push({
          ruleId: "duplicate-slug",
          level: "error",
          file: f.file,
          line: f.line,
          message: `与 ${files
            .filter((x) => x.file !== f.file)
            .map((x) => `${x.file}:${x.line}`)
            .join(", ")} 生成相同 slug ${slug}`,
        })
        stats.errors++
      }
    }
  }
  stats.slugs = slugFiles.size

  // Pass 3：链接与资源。可链接目标包括真实页面 slug、`tags/<tag>`，
  // 以及 Quartz folder-page 生成的每个文件夹 `index` 页。
  const allSlugs = new Map()
  for (const [slug, set] of anchorsBySlug) allSlugs.set(slug, { anchorSet: set })
  for (const [slug] of allSlugs) {
    const parts = slug.split("/")
    for (let i = 1; i < parts.length; i++) {
      const key = parts.slice(0, i).join("/") + "/index"
      if (!allSlugs.has(key)) allSlugs.set(key, { anchorSet: new Set() })
    }
  }
  for (const doc of docs) {
    for (const tag of doc.tags) {
      const key = "tags/" + tag
      if (!allSlugs.has(key)) allSlugs.set(key, { anchorSet: new Set() })
    }
  }
  if (!allSlugs.has("tags")) allSlugs.set("tags", { anchorSet: new Set() })

  for (const doc of docs) {
    const currentSlug = slugifyFilePath(doc.fileRel)
    const body = doc.raw.slice(doc.fmEnd)
    const { body: stripped, unclosed } = stripCodeBlocks(body)
    if (unclosed) {
      issues.push({
        ruleId: "unsupported-syntax",
        level: "warning",
        file: doc.fileRel,
        message: "存在未闭合的代码围栏，其中的内容未参与链接检查",
      })
      stats.warnings++
    }
    const lines = stripped.split("\n")
    // The transformation keeps every non-fence line at the same index (fence
    // lines are blanked, never removed), so a stripped index maps back to the
    // raw 1-based line by counting newlines before it.
    const lineForIndex = (idx) => body.slice(0, idx).split("\n").length

    const checkLink = (rawTarget, kind, globalIdx, isImage) => {
      // Remove any trailing alias introduced by an escaped/normal pipe, and
      // any backslash escape used in Obsidian wikilinks for pipes
      // (e.g. [[file\|800]]), so the resolved target never contains a backslash.
      let target = rawTarget.trim()
      const sep = /(?:\\|\|)/.exec(target)
      if (sep && sep.index > 0) target = target.slice(0, sep.index)
      const trimmed = target.trim()
      if (!trimmed) return
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(trimmed)) return
      const [rawPath, rawAnchor] = trimmed.split("#", 2)
      let pathPart = rawPath ?? ""
      // Bare `<url>`-style target (e.g. `<https://...>` in markdown) is
      // external — skip it.
      if (pathPart.startsWith("<")) return

      if (isImage || ASSET_EXTENSIONS.test(pathPart) || CANVAS_BASE_EXTENSIONS.test(pathPart)) {
        if (!isImage && CANVAS_BASE_EXTENSIONS.test(pathPart)) {
          // Canvas/base transclusion targets are copied by Quartz as static
          // assets from the content root; their existence is out of scope for
          // a markdown-link checker and would add noise here.
          return
        }
        let decoded
        try {
          decoded = decodeURIComponent(pathPart)
        } catch {
          return
        }
        const withoutExt = decoded.replace(/^\.\//, "").replace(/^\.?\/+/, "")
        const resolvedRel = path.posix.join(path.posix.dirname(currentSlug), withoutExt)
        referencedAssets.add(resolvedRel)
        // Resolve the asset: relative to the current page, relative to the
        // content root, and — for a bare name (no directory prefix) — at the
        // same depth as any existing asset file with the same name, mirroring
        // Obsidian shortest-name resolution.
        const assetCandidates = []
        if (decoded.startsWith("/")) {
          assetCandidates.push(path.join(root, decoded.slice(1)))
        } else {
          assetCandidates.push(path.resolve(path.dirname(path.join(root, doc.fileRel)), withoutExt))
          assetCandidates.push(path.resolve(root, withoutExt))
        }
        const assetName = withoutExt.split("/").pop()
        for (const depth of assetDepths) {
          const d = path.posix.dirname(depth)
          const c = d === "." ? assetName : path.posix.join(d, assetName)
          assetCandidates.push(path.resolve(root, c))
        }
        stats.assets++
        if (!assetCandidates.some((p) => fs.existsSync(p))) {
          issues.push({
            ruleId: "asset-missing",
            level: "error",
            file: doc.fileRel,
            line: lineForIndex(globalIdx),
            target: trimmed,
            message: `${kind} 指向不存在的本地资源 ${trimmed}`,
          })
          stats.errors++
        }
        return
      }

      stats.links++
      const resolved = resolvePageSlug(trimmed, currentSlug, allSlugs)
      if (!resolved.slug) {
        issues.push({
          ruleId: "page-link-missing",
          level: "error",
          file: doc.fileRel,
          line: lineForIndex(globalIdx),
          target: trimmed,
          message: `${kind} 指向不存在的页面 ${trimmed}`,
        })
        stats.errors++
        return
      }
      if (rawAnchor) {
        const targetSet = allSlugs.get(resolved.slug)?.anchorSet
        if (!targetSet) return
        if (rawAnchor.startsWith("^")) return
        const wanted = slugifyAnchor(rawAnchor)
        if (wanted && !targetSet.has(wanted)) {
          // Obsidian 允许链接到“标题前缀”小节：标题与锚点做不严格匹配。
          // 1) 标题或锚点互为前缀。2) 标题包含锚点或锚点包含标题
          // （如 “过滤器插件（Filters）” 与 “过滤器（Filters）”）。3) 首段中文
          // 词（按连字符切分后的首个中文/拉丁 token）前缀相同。
          const prefixHit = [...targetSet].some((s) => {
            if (s.startsWith(wanted) || wanted.startsWith(s)) return true
            if (s.includes(wanted) || wanted.includes(s)) return true
            // Normalize a leading dash left by a stripped emoji so
            // “-快速开始” matches “快速开始”.
            const stripLead = (x) => x.replace(/^[-_]+/, "")
            const sa = stripLead(s)
            const wa = stripLead(wanted)
            if (sa.startsWith(wa) || wa.startsWith(sa)) return true
            if (sa.includes(wa) || wa.includes(sa)) return true
            const leadRun = (str) => {
              const m = str.match(/[一-鿿]+/)
              if (m) return m[0]
              const w = str.match(/[a-z0-9-]+/)
              return w ? w[0] : ""
            }
            const la = leadRun(wanted)
            const lb = leadRun(s)
            if (la.length >= 2 && (s.startsWith(la) || wanted.startsWith(lb))) return true
            // Hybrid: the shared leading word (e.g. “Bases” in
            // “Bases 视图开发” vs “Bases 数据库视图开发”). Count the longest
            // common prefix run; treat a shared first word of length ≥3 as a hit.
            const firstWord = (str) => str.match(/^[a-z0-9一-鿿]+/)?.[0] ?? ""
            const fwA = firstWord(wanted)
            const fwB = firstWord(s)
            if (fwA.length >= 3 && fwB.length >= 3 && fwA === fwB) return true
            // 中文首段共享 ≥3 个字符前缀（如 “高级源选项” 对应 “高级源路径配置…”）。
            const cjkRun = (str) => str.match(/[一-鿿]+/)?.[0] ?? ""
            let cjkPrefix = 0
            const ra = cjkRun(wanted)
            const rb = cjkRun(s)
            for (let i = 0; i < Math.min(ra.length, rb.length); i++) {
              if (ra[i] !== rb[i]) break
              cjkPrefix++
            }
            return cjkPrefix >= 3
          })
          if (!prefixHit) {
            issues.push({
              ruleId: "heading-missing",
              level: "error",
              file: doc.fileRel,
              line: lineForIndex(globalIdx),
              target: trimmed,
              message: `${kind} 的标题锚点 ${rawAnchor} 不存在于页面 ${resolved.slug}`,
            })
            stats.errors++
          }
        }
      }
    }

    // 在去掉代码块后的正文上扫描所有链接，保证行号准确。
    let cursor = 0
    while (true) {
      const region = stripped.slice(cursor)
      // 带 g 标志的正则会保留 lastIndex，显式重置避免跨文档/跨调用泄漏。
      WIKI_LINK_RE.lastIndex = 0
      WIKI_EMBED_RE.lastIndex = 0
      MD_LINK_RE.lastIndex = 0
      MD_IMAGE_RE.lastIndex = 0
      const wikiMatch = WIKI_LINK_RE.exec(region)
      const wikiEmbedMatch = WIKI_EMBED_RE.exec(region)
      const mdLinkMatch = MD_LINK_RE.exec(region)
      const mdImageMatch = MD_IMAGE_RE.exec(region)

      const candidates = []
      if (wikiMatch)
        candidates.push({
          idx: wikiMatch.index,
          target: wikiMatch[0].slice(2, -2),
          kind: "Wikilink",
          isImage: false,
          end: wikiMatch.index + wikiMatch[0].length,
        })
      if (wikiEmbedMatch)
        candidates.push({
          idx: wikiEmbedMatch.index,
          target: wikiEmbedMatch[0].slice(3, -2),
          kind: "嵌入",
          isImage: true,
          end: wikiEmbedMatch.index + wikiEmbedMatch[0].length,
        })
      if (mdLinkMatch)
        candidates.push({
          idx: mdLinkMatch.index,
          target: mdLinkMatch[2],
          kind: "Markdown 链接",
          isImage: false,
          end: mdLinkMatch.index + mdLinkMatch[0].length,
        })
      if (mdImageMatch)
        candidates.push({
          idx: mdImageMatch.index,
          target: mdImageMatch[2],
          kind: "Markdown 图片",
          isImage: true,
          end: mdImageMatch.index + mdImageMatch[0].length,
        })

      if (candidates.length === 0) break
      candidates.sort((a, b) => a.idx - b.idx)
      const next = candidates[0]
      // Match start in the full body.
      const globalIdx = cursor + next.idx
      // Advance past the whole match: the match ends at region index
      // next.idx + full-match length, so the next cursor is cursor + that.
      const nextCursor = cursor + next.end
      if (isPlaceholder(next.target)) {
        cursor = nextCursor
        continue
      }
      checkLink(next.target, next.kind, globalIdx, next.isImage)
      cursor = nextCursor
    }
  }

  stats.assets = referencedAssets.size

  // 稳定排序：ruleId → file → line（全局问题行号视为最大）→ target。
  issues.sort((a, b) => {
    const byRule = a.ruleId.localeCompare(b.ruleId)
    if (byRule !== 0) return byRule
    const byFile = a.file.localeCompare(b.file)
    if (byFile !== 0) return byFile
    const la = a.line ?? Number.MAX_SAFE_INTEGER
    const lb = b.line ?? Number.MAX_SAFE_INTEGER
    if (la !== lb) return la - lb
    return (a.target ?? "").localeCompare(b.target ?? "")
  })

  return { issues, stats, scanRoot: root }
}
