/**
 * Offline harness that mirrors the Quartz build-time ContentIndex generation
 * for the content-discovery fixtures. It parses the fixture Markdown with
 * remark, extracts the same fields the build index uses (slug, title, tags,
 * plain text), applies the same published boundary as the build pipeline, and
 * filters the resulting index through the /search URL contract.
 *
 * The browser never re-parses Markdown: this harness only lets the offline
 * tests run the real filter/ranking logic against real fixture content.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import YAML from "yaml"
import { unified } from "unified"
import remarkParse from "remark-parse"
import type { Root, Root as MDRoot } from "mdast"
import { slugifyFilePath } from "@quartz-community/utils"
import { readFilters, rankEntries, type SearchEntry } from "../../quartz/util/searchDiscovery"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const FIXTURE_ROOT = path.resolve(__dirname, "..", "..", "fixtures", "content-discovery")

export interface FilteredSearchResult {
  slug: string
  title: string
  content: string
  tags: string[]
}

/** Minimum markdown -> plain-text transformation matching the build index. */
export function markdownToText(ast: Root): string {
  const parts: string[] = []
  const walk = (node: unknown): void => {
    if (node === null || node === undefined || typeof node !== "object") return
    const n = node as { type?: string; value?: string; children?: unknown[]; lang?: string }
    if (n.type === "code") return // code blocks contribute no text
    if (n.type === "text" && typeof n.value === "string") parts.push(n.value)
    if (n.children) {
      for (const child of n.children) walk(child)
    }
  }
  walk(ast)
  return parts.join(" ").replace(/\s+/g, " ").trim()
}

export interface ParsedPage {
  relativePath: string
  slug: string
  frontmatter: Record<string, unknown> | null
  text: string
}

function readMarkdownFile(fullPath: string): { text: string; ast: Root } {
  const source = fs.readFileSync(fullPath, "utf8")
  // Strip the YAML frontmatter before parsing; the build index stores page
  // text from the rendered body, never from the frontmatter block.
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
  const ast = unified().use(remarkParse).parse(body) as Root
  return { text: source, ast }
}

export function parsePage(relativePath: string): ParsedPage {
  const fullPath = path.join(FIXTURE_ROOT, relativePath)
  const { text, ast } = readMarkdownFile(fullPath)
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  const frontmatter = fm ? (YAML.parse(fm[1]) as Record<string, unknown>) : null
  return {
    relativePath,
    slug: slugifyFilePath(relativePath),
    frontmatter,
    text: markdownToText(ast),
  }
}

export function listMarkdownFiles(root: string = FIXTURE_ROOT): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(md|markdown)$/i.test(entry.name)) out.push(path.relative(root, full))
    }
  }
  walk(root)
  return out
}

/**
 * Mirror the build pipeline's published boundary:
 * - draft: true  -> excluded (RemoveDrafts)
 * - unlisted: true -> excluded from the public index (UnlistedPages)
 * - files under ignorePatterns / private/ignored dirs -> excluded
 */
export function isPublished(page: ParsedPage): boolean {
  const fm = page.frontmatter ?? {}
  if (fm.draft === true || fm.draft === "true") return false
  if (fm.unlisted === true || fm.unlisted === "true") return false
  return true
}

/** Build the exact public ContentIndex object the browser would fetch. */
export function buildPublicIndex(): Record<string, SearchEntry> {
  const index: Record<string, SearchEntry> = {}
  for (const relativePath of listMarkdownFiles()) {
    const page = parsePage(relativePath)
    if (!isPublished(page)) continue
    const fm = page.frontmatter ?? {}
    const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : []
    index[page.slug] = {
      slug: page.slug,
      title: typeof fm.title === "string" ? fm.title : "",
      content: page.text,
      tags,
    }
  }
  return index
}

/** Apply /search filters against the fixture content using real functions. */
export function searchWithParams(
  index: Record<string, SearchEntry>,
  search: string,
): FilteredSearchResult[] {
  const filters = readFilters(search)
  const entries = Object.values(index)
  return rankEntries(entries, filters).map(({ entry }) => entry)
}
