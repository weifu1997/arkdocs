import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import YAML from "yaml"

const root = process.cwd()
const contentDir = path.resolve(root, process.argv[2] ?? "content")

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function slugify(value) {
  return value
    .replaceAll("\\", "/")
    .replace(/\.(md|markdown)$/i, "")
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/index$/i, "index")
        .replace(/\s/g, "-")
        .toLowerCase(),
    )
    .join("/")
    .replace(/\/index$/, "")
}

function parseDocument(filePath) {
  const relativePath = path.relative(contentDir, filePath).replaceAll(path.sep, "/")
  const source = fs.readFileSync(filePath, "utf8")
  if (!source.startsWith("---\n")) {
    return { relativePath, source, frontmatter: null, body: source }
  }

  const end = source.indexOf("\n---", 4)
  if (end === -1) {
    return {
      relativePath,
      source,
      frontmatter: null,
      body: source,
      frontmatterError: "未找到 Frontmatter 结束标记",
    }
  }

  const raw = source.slice(4, end)
  try {
    const frontmatter = YAML.parse(raw)
    return { relativePath, source, frontmatter, body: source.slice(end + 4) }
  } catch (error) {
    return {
      relativePath,
      source,
      frontmatter: null,
      body: source.slice(end + 4),
      frontmatterError: error instanceof Error ? error.message : String(error),
    }
  }
}

function normalizeTarget(target, currentPath) {
  const withoutAnchor = target.split("#", 1)[0].split("?", 1)[0]
  if (!withoutAnchor) return ""
  const decoded = decodeURIComponent(withoutAnchor)
  const resolved = decoded.startsWith("/")
    ? decoded.slice(1)
    : path.posix.join(path.posix.dirname(currentPath), decoded)
  return slugify(resolved.replace(/^\.\//, ""))
}

function targetCandidates(target, currentPath) {
  const withoutAnchor = target.split("#", 1)[0].split("?", 1)[0]
  if (!withoutAnchor) return []
  const decoded = decodeURIComponent(withoutAnchor)
  const direct = slugify(decoded.replace(/^\.\//, "").replace(/^\//, ""))
  const relative = normalizeTarget(decoded, currentPath)
  const candidates = new Set([direct, relative])
  if (!direct.includes("/")) {
    for (const slug of validSlugs) if (slug.endsWith(`/${direct}`)) candidates.add(slug)
  }
  return [...candidates].filter(Boolean)
}

function isExternal(target) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)
}

const files = walk(contentDir).filter((filePath) => /\.(md|markdown)$/i.test(filePath))
const documents = files.map(parseDocument)
const errors = []
const slugs = new Map()
const tagSlugs = new Set()

for (const document of documents) {
  if (document.frontmatterError) {
    errors.push(`${document.relativePath}: Frontmatter ${document.frontmatterError}`)
    continue
  }
  if (!document.frontmatter || typeof document.frontmatter !== "object") {
    errors.push(`${document.relativePath}: 缺少有效 Frontmatter`)
    continue
  }
  if (typeof document.frontmatter.title !== "string" || !document.frontmatter.title.trim()) {
    errors.push(`${document.relativePath}: title 必须是非空字符串`)
  }

  const slug = slugify(document.relativePath)
  if (slugs.has(slug)) {
    errors.push(`${document.relativePath}: 与 ${slugs.get(slug)} 产生重复 slug ${slug}`)
  } else {
    slugs.set(slug, document.relativePath)
  }
  const tags = Array.isArray(document.frontmatter.tags) ? document.frontmatter.tags : []
  for (const tag of tags) {
    if (typeof tag === "string" && tag.trim()) tagSlugs.add(`tags/${slugify(tag.trim())}`)
  }
}

// Quartz emits virtual folder and tag pages, so include them in link validation.
const validSlugs = new Set(slugs.keys())
for (const document of documents) {
  const segments = document.relativePath.split("/")
  for (let index = 1; index < segments.length; index += 1) {
    validSlugs.add(segments.slice(0, index).join("/").toLowerCase())
  }
}
for (const tagSlug of tagSlugs) validSlugs.add(tagSlug)

for (const document of documents) {
  const checkLink = (rawTarget, kind) => {
    if (!rawTarget || isExternal(rawTarget)) return
    const [targetPath, anchor] = rawTarget.split("#", 2)
    if (/\.(?:png|jpe?g|gif|svg|webp|canvas|base|pdf|mp4|mp3|wav|webm|ogg)$/i.test(targetPath))
      return

    const candidates = targetCandidates(targetPath, document.relativePath)
    const resolved = candidates.find((candidate) => validSlugs.has(candidate))
    if (!resolved) {
      errors.push(`${document.relativePath}: ${kind} 指向不存在的页面 ${rawTarget}`)
      return
    }
    // Heading anchors are normalized by Quartz's markdown pipeline and may
    // differ from GitHub's slugger for legacy content, so page resolution is
    // the hard failure gate here.
  }

  const body = document.body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/`[^`]*`/g, "")
  for (const match of body.matchAll(/!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
    const target = match[1].trim().replaceAll("\\", "")
    // Documentation examples intentionally use placeholder links such as [[Page]].
    if (
      !/^(?:页面|文件路径|图片路径|My Note|my note|MY NOTE|Page|TODO|DONE|video|audio|pdf|>)$/.test(
        target,
      )
    ) {
      checkLink(target, "Wikilink")
    }
  }
  for (const match of body.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "").replaceAll("\\", "")
    if (target !== "link") checkLink(target, "Markdown 链接")
  }
}

if (errors.length > 0) {
  console.error(`内容检查失败：发现 ${errors.length} 个问题`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`内容检查通过：${documents.length} 篇文档，${validSlugs.size} 个可链接页面`)
}
