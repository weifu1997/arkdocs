/**
 * Content quality scan: applies the local link/style rules to a content
 * directory and returns a stable-sorted issue list plus summary statistics.
 */
import fs from "node:fs"
import path from "node:path"
import { minimatch } from "minimatch"
import { analyzeMarkdown } from "./analyze.mjs"
import {
  slugifyFilePath,
  getAllSegmentPrefixes,
  splitAnchor,
  resolvePageTarget,
  resolveAssetTarget,
  joinSegments,
} from "./slugs.mjs"

export const RULE_IDS = {
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

const EXTERNAL_RE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i
const ASSET_RE = /\.(?:png|jpe?g|gif|svg|webp|pdf|mp3|mp4|wav|webm|ogg)$/i
const BLOCK_REF_RE = /(?:#|\[\[).*\^/

/** All files in the directory tree (md + assets), sorted for a deterministic walk. */
function listAll(rootDir, ignorePatterns) {
  const files = []
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else {
        const rel = path.relative(rootDir, full).replaceAll(path.sep, "/")
        if (!matchesIgnore(rel, ignorePatterns)) files.push(rel)
      }
    }
  }
  walk(rootDir)
  return files.sort()
}

/** Markdown files in the directory tree, sorted for a deterministic walk. */
function listMarkdown(rootDir, ignorePatterns) {
  return listAll(rootDir, ignorePatterns).filter((rel) => /\.(?:md|markdown)$/i.test(rel))
}

export function matchesIgnore(relativePath, patterns) {
  return (patterns ?? []).some((pattern) => {
    if (pattern.startsWith("!")) {
      const negated = pattern.slice(1)
      if (minimatch(relativePath, negated, { dot: true })) return false
      return false
    }
    return minimatch(relativePath, pattern, { dot: true })
  })
}

function readRelative(rootDir, rel) {
  return fs.readFileSync(path.join(rootDir, rel), "utf8")
}

export function scan(rootDir, ignorePatterns = []) {
  const markdownFiles = listMarkdown(rootDir, ignorePatterns)
  const documents = markdownFiles.map((rel) => ({
    rel,
    ...analyzeMarkdown(rel, readRelative(rootDir, rel)),
  }))

  const pages = documents.filter((doc) => !isDraft(doc))
  const slugs = pages.map((doc) => doc.slug)
  // All source-tree entries (md + assets), for shortest-name asset resolution
  // matching the build.
  const allFilePaths = listAll(rootDir, ignorePatterns)
  const slugSet = new Set(slugs)

  // Virtual pages emitted by the build on the same published set:
  // folder pages (slugified directory prefixes + "/index"), tag pages (all
  // tag prefixes), the /search virtual page, and the 404 virtual page.
  const virtualSlugs = new Set()
  for (const doc of pages) {
    const segments = doc.slug.split("/")
    for (let i = 1; i < segments.length; i++) {
      const prefix = segments.slice(0, i).join("/")
      if (prefix && prefix !== "tags") {
        virtualSlugs.add(joinSegments(prefix, "index"))
        virtualSlugs.add(prefix)
      }
    }
  }
  virtualSlugs.add("index")
  for (const doc of pages) {
    const tags = Array.isArray(doc.frontmatter?.tags) ? doc.frontmatter.tags : []
    for (const tag of tags) {
      if (typeof tag !== "string") continue
      for (const prefix of getAllSegmentPrefixes(tag)) virtualSlugs.add(`tags/${prefix}`)
    }
  }
  virtualSlugs.add("search")
  virtualSlugs.add("404")
  // Non-md source entries (.base/.canvas data sources, assets) appear in the
  // build's ctx.allSlugs and are linkable; do not report them as missing.
  for (const rel of allFilePaths) {
    if (/\.(md|markdown)$/i.test(rel)) continue
    virtualSlugs.add(slugifyFilePath(rel))
  }

  const headingAnchors = new Map()
  for (const doc of pages) {
    headingAnchors.set(doc.slug, doc.headingAnchors)
  }

  // Virtual page slugs are linkable: folder pages (directory prefixes) and
  // tag pages (`tags/<tag>` prefixes), plus the virtual /search and 404 pages.
  const linkableSlugs = new Set([...slugs, ...virtualSlugs])

  const issues = []

  const addIssue = (issue) => issues.push(issue)

  // Frontmatter rules, including the fields the build filters on.
  for (const doc of documents) {
    if (doc.frontmatterError && doc.frontmatterError.message !== "缺少 Frontmatter") {
      addIssue({
        ruleId: RULE_IDS.FRONTMATTER_PARSE_FAILED,
        level: "error",
        file: doc.rel,
        line: doc.frontmatterError.line ?? 1,
        target: null,
        message: `Frontmatter 解析失败：${doc.frontmatterError.message}`,
      })
      continue
    }
    if (doc.frontmatter === null) {
      addIssue({
        ruleId: RULE_IDS.FRONTMATTER_MISSING,
        level: "error",
        file: doc.rel,
        line: 1,
        target: null,
        message: "缺少 Frontmatter",
      })
      continue
    }

    const fm = doc.frontmatter
    if (typeof fm.title !== "string" || !fm.title.trim()) {
      addIssue({
        ruleId: RULE_IDS.TITLE_MISSING,
        level: "error",
        file: doc.rel,
        line: doc.keyLines.title ?? 2,
        target: "title",
        message: "title 必须是非空字符串",
      })
    }

    const typeWarnings = []
    if ("tags" in fm && (!Array.isArray(fm.tags) || fm.tags.some((t) => typeof t !== "string"))) {
      typeWarnings.push("tags 必须是字符串数组")
    }
    for (const field of ["draft", "publish", "unlisted"]) {
      if (field in fm && typeof fm[field] !== "boolean" && fm[field] !== "true") {
        typeWarnings.push(`${field} 必须是布尔值`)
      }
    }
    for (const warning of typeWarnings) {
      addIssue({
        ruleId: RULE_IDS.FRONTMATTER_FIELD_TYPE,
        level: "warning",
        file: doc.rel,
        line: doc.keyLines[warning.split(" ")[0]] ?? 2,
        target: warning.split(" ")[0],
        message: warning,
      })
    }
  }

  // Duplicate slugs, following the build's last-write-wins warning.
  const bySlug = new Map()
  for (const doc of pages) {
    const list = bySlug.get(doc.slug) ?? []
    list.push(doc)
    bySlug.set(doc.slug, list)
  }
  for (const [slug, group] of bySlug) {
    if (group.length < 2) continue
    const conflicts = group.map((doc) => ({
      file: doc.rel,
      line: doc.frontmatterError?.line ?? 1,
    }))
    for (const doc of group) {
      addIssue({
        ruleId: RULE_IDS.DUPLICATE_SLUG,
        level: "error",
        file: doc.rel,
        line: doc.frontmatterError?.line ?? 1,
        target: slug,
        files: conflicts,
        message: `与其他 ${conflicts.length - 1} 个文件产生重复 slug：${slug}`,
      })
    }
  }

  // Link and asset rules over the published set.
  const assetReferences = new Set()
  let linkReferenceCount = 0
  for (const doc of pages) {
    for (const link of doc.links) {
      if (!link.target) continue
      if (EXTERNAL_RE.test(link.target)) continue
      linkReferenceCount += 1

      const target = link.target.replaceAll(String.fromCharCode(92), "").trim()
      if (!target) continue

      const isAsset = ASSET_RE.test(target) && !BLOCK_REF_RE.test(target)
      if (isAsset) {
        assetReferences.add(target)
        const resolved = resolveAssetTarget(target, doc.rel, rootDir, fs, allFilePaths)
        if (!resolved) {
          addIssue({
            ruleId: RULE_IDS.ASSET_MISSING,
            level: "error",
            file: doc.rel,
            line: link.line,
            target,
            message: `本地资源不存在：${target}`,
          })
        }
        continue
      }

      if (BLOCK_REF_RE.test(target)) {
        addIssue({
          ruleId: RULE_IDS.UNSUPPORTED_SYNTAX,
          level: "warning",
          file: doc.rel,
          line: link.line,
          target,
          message: "块引用（[[^id]]）无法静态验证",
        })
        continue
      }

      const { slug: resolved, anchor } = resolvePageTarget(target, doc.slug, linkableSlugs)
      if (!resolved) {
        addIssue({
          ruleId: RULE_IDS.PAGE_LINK_MISSING,
          level: "error",
          file: doc.rel,
          line: link.line,
          target,
          message: `页面不存在：${target}`,
        })
        continue
      }

      // Heading anchor check against Quartz's actual slug rule.
      if (anchor) {
        const pageAnchors = headingAnchors.get(resolved)
        if (pageAnchors === undefined) {
          // Virtual page (folder/tag/search/404) without parseable headings:
          // anchors cannot be verified statically.
          continue
        }
        if (!pageAnchors.has(anchor.replace(/^#/, ""))) {
          addIssue({
            ruleId: RULE_IDS.HEADING_MISSING,
            level: "error",
            file: doc.rel,
            line: link.line,
            target: `${resolved}${anchor}`,
            message: `标题锚点不存在：${resolved}${anchor}`,
          })
        }
      }
    }
  }

  issues.sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1
    if ((a.line ?? 0) !== (b.line ?? 0)) return (a.line ?? 0) - (b.line ?? 0)
    if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1
    const ta = a.target ?? ""
    const tb = b.target ?? ""
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })

  const errorCount = issues.filter((i) => i.level === "error").length
  const warningCount = issues.filter((i) => i.level === "warning").length

  return {
    stats: {
      documents: documents.length,
      pages: pages.length,
      assets: assetReferences.size,
      links: linkReferenceCount,
      errors: errorCount,
      warnings: warningCount,
    },
    issues,
  }
}

function isDraft(doc) {
  const fm = doc.frontmatter
  if (!fm) return false
  return fm.draft === true || fm.draft === "true"
}

export { slugifyFilePath, getAllSegmentPrefixes, splitAnchor }
