/**
 * Shared, framework-free search data logic for the public `/search` page and
 * the `static/searchIndex.json` emitter.
 *
 * The browser must NOT re-parse Markdown: the emitter serializes a flat index
 * built from the processed vfile data once at build time, and the page script
 * only filters/scores that index. The same pure functions are used by the
 * offline tests, so the scoring/filtering contract is unit-testable without a
 * browser.
 *
 * Scoring contract (see docs/search-and-content-quality.md):
 *  - an empty query with no filters shows the initial state (no listing)
 *  - each query term (whitespace split; CJK handled per-character) must be a
 *    substring of `(title + "\n" + content)` after case-insensitive
 *    normalization
 *  - term hit in title scores 3, term hit in content scores 1 (per term)
 *  - tags and folders are pure AND filters; they do not affect ranking
 *  - final order: score descending, then normalized slug ascending
 */

import { FilePath, simplifySlug, slugifyFilePath } from "../../util/path"
import { ProcessedContent } from "../vfile"

/** Stable fallback description when a page has none. */
export const FALLBACK_DESCRIPTION = "ArkDocs"

export interface SearchIndexEntry {
  slug: string
  title: string
  description: string
  /** Searchable, plain page text (Markdown is stripped by the build pipeline). */
  content: string
  /** Normalized folder path of the page slug, e.g. "features"; "" for root. */
  folder: string
  /** Frontmatter tags as authored (comparisons are case/whitespace-insensitive). */
  tags: string[]
}

export interface SearchFilter {
  /** Query string from the `q` URL parameter. */
  q: string
  tags: string[]
  folder: string
}

/** Alias for the `q` field, kept for readability at call sites. */
export type SearchQuery = SearchFilter["q"]

/** Lower-case + diacritic-insensitive normalization for comparisons. */
export function normalizeForCompare(value: string): string {
  return (value ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/**
 * Normalize a raw tag or folder URL parameter for comparison.
 *
 * Build-time tags are slugified by the note-properties transformer, and
 * folders derive from slugs — so comparison must apply the same per-segment
 * slug rule (space -> "-", "&" -> "-and-", "%" -> "-percent", invalid chars
 * removed, lower-case) in addition to case/whitespace normalization.
 */
export function normalizeParam(value: string): string {
  return normalizeForCompare(value)
    .replace(/&/g, "-and-")
    .replace(/%/g, "-percent")
    .replace(/\?/g, "")
    .replace(/#/g, "")
    .replace(/[<>:"|*]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Folder of a page slug (everything before the last path segment). */
export function folderOfSlug(slug: string): string {
  const idx = slug.lastIndexOf("/")
  return idx > 0 ? slug.slice(0, idx) : ""
}

/** Parse `/search` URL params. Repeated `tag` params combine with AND. */
export function parseSearchParams(params: URLSearchParams): SearchFilter {
  const tags = (params.getAll("tag") ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)
  return {
    q: (params.get("q") ?? "").trim(),
    tags,
    folder: (params.get("folder") ?? "").trim(),
  }
}

/** Serialize a filter back to a query string (empty values are omitted). */
export function serializeSearchParams(filter: SearchFilter): string {
  const params = new URLSearchParams()
  if (filter.q) params.set("q", filter.q)
  for (const tag of filter.tags) params.append("tag", tag)
  if (filter.folder) params.set("folder", filter.folder)
  return params.toString()
}

/** Split a query into term tokens: whitespace-separated words, CJK per char. */
export function queryTerms(query: string): string[] {
  const terms: string[] = []
  const seen = new Set<string>()
  const push = (term: string) => {
    const normalized = normalizeForCompare(term)
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized)
      terms.push(normalized)
    }
  }

  for (const chunk of (query ?? "").split(/\s+/)) {
    if (!chunk) continue
    let buffer = ""
    for (const char of chunk) {
      const code = char.codePointAt(0)!
      const isCJK =
        (code >= 0x3040 && code <= 0x30ff) || // Hiragana/Katakana
        (code >= 0x4e00 && code <= 0x9fff) || // CJK unified ideographs
        (code >= 0xac00 && code <= 0xd7af) || // Hangul syllables
        (code >= 0x20000 && code <= 0x2a6df) // CJK ext B
      if (isCJK) {
        if (buffer) {
          push(buffer)
          buffer = ""
        }
        push(char)
      } else {
        buffer += char
      }
    }
    if (buffer) push(buffer)
  }
  return terms
}

/** Tags AND-match: every requested tag must be present, case/whitespace-insensitive. */
export function matchesTags(entry: SearchIndexEntry, tags: string[]): boolean {
  if (tags.length === 0) return true
  const entryTags = new Set((entry.tags ?? []).map((tag) => normalizeParam(tag)))
  return tags.every((tag) => entryTags.has(normalizeParam(tag)))
}

/**
 * Folder match: the folder must equal the requested folder or live under it
 * (folder=features matches features/ and its sub-directories).
 */
export function matchesFolder(entry: SearchIndexEntry, folder: string): boolean {
  if (!folder) return true
  const requested = normalizeParam(folder)
  if (!requested) return true
  const entryFolder = normalizeParam(entry.folder)
  return entryFolder === requested || entryFolder.startsWith(requested + "/")
}

/**
 * Query match: every normalized term must be a substring of
 * `(title + "\n" + content)`. Empty query matches everything.
 */
export function matchesQuery(entry: SearchIndexEntry, query: string): boolean {
  const terms = queryTerms(query)
  if (terms.length === 0) return true
  const haystack = normalizeForCompare(`${entry.title}\n${entry.content}`)
  return terms.every((term) => haystack.includes(term))
}

export function matchesFilter(entry: SearchIndexEntry, filter: SearchFilter): boolean {
  return (
    matchesTags(entry, filter.tags) &&
    matchesFolder(entry, filter.folder) &&
    matchesQuery(entry, filter.q)
  )
}

/**
 * Deterministic relevance score for a query.
 * title hit per term: 3, content hit per term: 1.
 * Returns null when the query does not match the entry at all.
 */
export function scoreEntry(entry: SearchIndexEntry, query: string): number | null {
  const terms = queryTerms(query)
  if (terms.length === 0) return 0
  const title = normalizeForCompare(entry.title)
  const content = normalizeForCompare(entry.content)
  let score = 0
  for (const term of terms) {
    const inTitle = title.includes(term)
    const inContent = content.includes(term)
    if (!inTitle && !inContent) return null
    if (inTitle) score += 3
    if (inContent) score += 1
  }
  return score
}

/**
 * Final ordering: relevance descending, then normalized slug ascending
 * (locale-insensitive deterministic string compare). Same input always
 * yields the same order.
 */
export function compareSearchResults(
  a: { entry: SearchIndexEntry; score: number },
  b: { entry: SearchIndexEntry; score: number },
): number {
  if (b.score !== a.score) return b.score - a.score
  const slugA = normalizeForCompare(a.entry.slug)
  const slugB = normalizeForCompare(b.entry.slug)
  return slugA < slugB ? -1 : slugA > slugB ? 1 : 0
}

/** Filter + score + sort pipeline used by the page script and the tests. */
export function runSearch(index: SearchIndexEntry[], filter: SearchFilter): SearchIndexEntry[] {
  return index
    .filter((entry) => matchesFilter(entry, filter))
    .map((entry) => ({ entry, score: scoreEntry(entry, filter.q) ?? 0 }))
    .sort(compareSearchResults)
    .map(({ entry }) => entry)
}

/**
 * Build the public search index from processed content.
 *
 * Published boundary (fixed mapping):
 *  - `draft: true` pages were already removed by the RemoveDrafts filter
 *  - `unlisted: true` pages are skipped here (mirrors contentIndex.json)
 *  - pages matched by `ignorePatterns` were filtered before parsing
 *  - the 404 virtual page is never indexed
 */
export function buildSearchIndex(content: ProcessedContent[]): SearchIndexEntry[] {
  const entries: SearchIndexEntry[] = []
  for (const [, file] of content) {
    const data = file.data as Record<string, unknown>
    const slug = (data.slug as string | undefined) ?? ""
    if (!slug || slug === "404") continue
    if (data.unlisted === true) continue

    const frontmatter = (data.frontmatter ?? {}) as Record<string, unknown>
    const rawTags = frontmatter.tags
    const tags = Array.isArray(rawTags)
      ? rawTags.filter((tag): tag is string => typeof tag === "string")
      : []

    const description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : FALLBACK_DESCRIPTION

    entries.push({
      slug,
      title:
        typeof frontmatter.title === "string" && frontmatter.title.trim()
          ? frontmatter.title
          : simplifySlug(slug),
      description,
      content: typeof data.text === "string" ? data.text : "",
      folder: folderOfSlug(slug),
      tags,
    })
  }

  entries.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
  return entries
}

/** Re-export of the Quartz slug rule so quality checks and the emitter agree. */
export function slugForRelativePath(relativePath: string): string {
  return slugifyFilePath(relativePath as FilePath)
}
