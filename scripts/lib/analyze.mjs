/**
 * Markdown structural analysis for the local content quality check.
 *
 * - Parses Markdown with remark-parse (a finite-state/processor-based approach,
 *   not a single broad regex).
 * - Extracts frontmatter and validates the fields the build pipeline relies on.
 * - Walks the AST (skipping code blocks) for links, images, link definitions
 *   and wikilinks, keeping source line positions.
 * - Collects headings with their Quartz-compatible slug anchors.
 *
 * The actual rule evaluation (resolving targets against the build's virtual
 * page set) lives in scan.mjs; this module only produces raw analysis.
 */
import { unified } from "unified"
import remarkParse from "remark-parse"
import YAML from "yaml"
import { slug } from "github-slugger"
import { slugifyFilePath } from "./slugs.mjs"

const CODE_EXTS = /\.(?:png|jpe?g|gif|svg|webp|mp3|mp4|wav|webm|ogg|mpga)$/i

const parseFrontmatter = (source) => {
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return { present: false }
  }
  const end = source.indexOf("\n---", 4)
  if (end === -1) {
    return { present: true, error: { message: "未找到 Frontmatter 结束标记" }, body: source }
  }
  const raw = source.slice(4, end)
  try {
    const parsed = YAML.parse(raw)
    return { present: true, frontmatter: parsed ?? {}, raw }
  } catch (error) {
    const offset = Array.isArray(error.pos) ? (error.pos[0] ?? 0) : 0
    const line = source.slice(0, 4 + offset).split("\n").length
    return {
      present: true,
      error: { message: error.message ?? String(error), line: Math.min(line, end) },
      body: source,
    }
  }
}

export function analyzeMarkdown(relativePath, source) {
  const result = {
    relativePath,
    slug: slugifyFilePath(relativePath),
    frontmatter: null,
    frontmatterError: null,
    frontmatterRaw: "",
    body: "",
    headingAnchors: new Map(),
    links: [],
    codeBlocks: [],
    keyLines: {},
  }

  const fm = parseFrontmatter(source)
  if (!fm.present) {
    result.frontmatter = null
    result.frontmatterError = { message: "缺少 Frontmatter", line: 1 }
  } else if (fm.error) {
    result.frontmatter = null
    result.frontmatterError = fm.error
    result.frontmatterRaw = fm.raw ?? ""
  } else {
    result.frontmatter = fm.frontmatter
    result.frontmatterRaw = fm.raw
  }
  result.body = source.slice(
    typeof result.frontmatterError?.line === "number" ? result.frontmatterError.line : 0,
  )
  if (fm.raw !== undefined) {
    const startLine = source.slice(0, 4).split("\n").length
    for (const [key, lineNo] of Object.entries(findKeyLines(fm.raw, startLine))) {
      result.keyLines[key] = lineNo
    }
  }

  const ast = unified().use(remarkParse).parse(source)
  if (typeof ast.position !== "object") return result

  collectLinks(ast, result)
  collectHeadings(ast, result)
  return result
}

function findKeyLines(rawFrontmatter, startLine) {
  const lines = rawFrontmatter.split("\n")
  const map = {}
  const keyRe = /^(\s*)([A-Za-z0-9_.-]+):/
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(keyRe)
    if (match && match[1].length === 0) map[match[2]] = startLine + i
  }
  return map
}

function lineOf(node) {
  return node.position?.start?.line ?? null
}

function collectHeadings(ast, result) {
  const seen = new Set()
  const walk = (node) => {
    if (!node || typeof node.type !== "string") return
    if (node.type.startsWith("code")) {
      result.codeBlocks.push({
        start: node.position?.start?.line,
        end: node.position?.end?.line,
      })
      return
    }
    if (node.type === "heading") {
      const text = headingText(node)
      const anchor = slug(text)
      if (anchor && !seen.has(anchor)) {
        seen.add(anchor)
        result.headingAnchors.set(anchor, node.position?.start?.line ?? null)
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child)
    }
  }
  walk(ast)
}

function headingText(node) {
  const parts = []
  const walk = (n) => {
    if (typeof n?.value === "string") parts.push(n.value)
    if (Array.isArray(n?.children)) for (const child of n.children) walk(child)
  }
  walk(node)
  return parts.join("")
}

function collectLinks(ast, result) {
  const definitions = new Map()
  const walk = (node) => {
    if (!node || typeof node.type !== "string") return
    if (node.type.startsWith("code")) return

    if (node.type === "definition" && node.url) {
      definitions.set(node.label, node.url)
    }
    if (node.type === "heading") {
      // Link nodes inside headings are still valid links.
      for (const child of node.children ?? []) walk(child)
      return
    }

    if (node.type === "link" || node.type === "image") {
      result.links.push({
        kind: node.type === "image" ? "image" : "link",
        target: node.url ?? "",
        line: lineOf(node),
      })
    } else if (node.type === "linkReference") {
      const target = definitions.get(node.label) ?? node.url ?? ""
      if (target) {
        result.links.push({
          kind: node.type === "imageReference" ? "image" : "link",
          target,
          line: lineOf(node),
        })
      }
    } else if (node.type === "text") {
      // Wikilinks reach remark-parse as plain text tokens (the Obsidian
      // transform only runs when the build processor pipeline includes it).
      for (const match of (node.value ?? "").matchAll(/!?\[\[([^\]]*)\]\]/g)) {
        const embeds = match.index < match[0].length && match[0].startsWith("!")
        const content = match[1].trim()
        const target = content.split("|")[0].trim()
        result.links.push({
          kind: embeds ? "embed" : "wikilink",
          target,
          line: node.position?.start?.line ?? null,
        })
      }
    } else if (node.type === "html") {
      for (const match of (node.value ?? "").matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)) {
        const target = match[1].trim()
        if (target) {
          result.links.push({
            kind: "html",
            target,
            line: node.position?.start?.line ?? null,
          })
        }
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child)
    }
  }
  walk(ast)
}
