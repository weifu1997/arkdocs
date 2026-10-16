/**
 * Public /search data adapter.
 *
 * Pure functions shared between the browser SearchPage component and the
 * offline tests. The browser never re-parses Markdown: it consumes the
 * existing Content Index (static/contentIndex.json), whose build-time shape is
 *
 *   { [slug]: { slug, filePath, title, links[], tags[], content, description } }
 *
 * Only published pages are allowed through (draft / unlisted / ignored
 * pages are already filtered out of the public index, and the adapter keeps a
 * defensive guard for the same contract).
 */

export interface SearchIndexEntry {
  slug: string
  filePath?: string
  title?: string
  tags?: unknown
  content?: string
  links?: unknown
  description?: string
  [key: string]: unknown
}

export type SearchIndex = Record<string, SearchIndexEntry>

export interface SearchFilters {
  /** Normalized query text (may be empty). */
  query: string
  /** Lowercased tags, AND semantics. */
  tags: string[]
  /** Normalized folder slug prefix, matching the folder and its sub-folders. */
  folder: string
}

export type LoadState = "idle" | "loading" | "ready" | "error" | "empty"

export const FALLBACK_DESCRIPTION = "暂无描述"

/** Collapse all whitespace (including Unicode) to single spaces. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

/** Lowercase, trim, and collapse whitespace. */
export function normalizeText(value: string): string {
  return collapseSpaces((value ?? "").toLowerCase())
}

/** Normalize a user-supplied tag for comparison. */
export function normalizeTag(value: string): string {
  return collapseSpaces((value ?? "").toLowerCase())
}

/**
 * Normalize a user-supplied folder path.
 *
 * Mirrors the on-disk slug rules: URL-decoded, backslashes treated as
 * separators, extension stripped, whitespace -> single dashes, lowercased,
 * repeated dashes collapsed, and a trailing `index` segment removed so that
 * `features/` and `features/index` are equivalent prefixes.
 */
export function normalizeFolder(value: string): string {
  let input = value ?? ""
  try {
    input = decodeURIComponent(input)
  } catch {
    // Invalid percent-encoding keeps the raw value; it matches nothing.
  }
  return normalizeSlugPrefix(input)
}

/**
 * Normalize a slug-like prefix for folder matching. Shared with the search
 * slug generation so `folder=features` and `folder=features/index` behave
 * identically.
 */
export function normalizeSlugPrefix(value: string): string {
  return collapseSlug(
    (value ?? "").replaceAll("\\", "/").replace(/\.(md|markdown)$/i, ""),
  )
}

function collapseSlug(value: string): string {
  return (value ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.trim().replace(/\s+/g, "-").replace(/-{2,}/g, "-").toLowerCase())
    .join("/")
    .replace(/\/index$/, "")
}

/**
 * Parse the public /search URL query string. Accepts either a raw query
 * string (without the leading `?`) or a full URL so callers never have to
 * guard the `URL` constructor with an arbitrary base.
 *
 * `tag` may repeat (multiple tags are ANDed); `folder` is taken from the last
 * non-empty occurrence. Invalid percent-encoding never throws.
 */
export function parseSearchQuery(raw: string | URL): SearchFilters {
  let queryString = ""
  if (raw instanceof URL) {
    queryString = raw.search
  } else if (typeof raw === "string") {
    let text = raw
    if (text.startsWith("http://") || text.startsWith("https://")) {
      queryString = new URL(text).search
    } else {
      // Accept /search?... and search?... as well as the bare query string.
      const queryIndex = text.indexOf("?")
      if (queryIndex !== -1) {
        text = text.slice(queryIndex + 1)
      }
      queryString = text.startsWith("#") ? "" : text
    }
  }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(queryString)
  } catch {
    return { query: "", tags: [], folder: "" }
  }

  const tags: string[] = []
  for (const rawTag of params.getAll("tag")) {
    const tag = normalizeTag(rawTag)
    if (tag && !tags.includes(tag)) tags.push(tag)
  }

  let folder = ""
  for (const rawFolder of params.getAll("folder")) {
    const normalized = normalizeFolder(rawFolder)
    if (normalized) folder = normalized
  }

  return {
    query: normalizeText(params.get("q") ?? ""),
    tags,
    folder,
  }
}

/**
 * Build the canonical /search URL from filters. Always encodes Chinese,
 * spaces and hyphens through URLSearchParams so round-trips are exact.
 */
export function toSearchURL(filters: SearchFilters): string {
  const params = new URLSearchParams()
  if (filters.query) params.set("q", filters.query)
  for (const tag of filters.tags) params.append("tag", tag)
  if (filters.folder) params.set("folder", filters.folder)
  const encoded = params.toString()
  return encoded ? `/search?${encoded}` : "/search"
}

/**
 * Slug of a page's containing folder (e.g. ["features", "folder"] for
 * `features/folder and tag listings.md`). Returns "" for root pages.
 */
export function pageFolder(slug: string): string {
  const segments = slug.split("/").filter(Boolean)
  segments.pop()
  return segments.join("/")
}

function tagListOf(entry: SearchIndexEntry): string[] {
  const tags = Array.isArray(entry.tags) ? entry.tags : []
  const out: string[] = []
  for (const tag of tags) {
    if (typeof tag === "string" && tag.trim()) out.push(normalizeTag(tag))
  }
  return out
}

function contentText(entry: SearchIndexEntry): string {
  return typeof entry.content === "string" ? entry.content : ""
}

/**
 * Match a single index entry against the given filters.
 *
 * - Query: substring match against a normalized haystack (title, tags,
 *   content). Empty query matches everything.
 * - Tags: every requested tag must be present (AND).
 * - Folder: the page's slug must live under the requested folder prefix.
 */
export function matchesFilters(
  entry: SearchIndexEntry,
  filters: SearchFilters,
): boolean {
  const slug = entry.slug ?? ""
  if (filters.tags.length > 0) {
    const pageTags = tagListOf(entry)
    for (const tag of filters.tags) {
      if (!pageTags.some((t) => t === tag || t.startsWith(`${tag}/`))) return false
    }
  }
  if (filters.folder) {
    const pageFolderSlug = pageFolder(slug)
    const inFolder =
      pageFolderSlug === filters.folder ||
      pageFolderSlug.startsWith(`${filters.folder}/`)
    if (!inFolder) return false
  }
  if (!filters.query) return true
  const haystack = normalizeText(
    [entry.title ?? "", ...tagListOf(entry), contentText(entry)].join(" "),
  )
  return haystack.includes(filters.query)
}

export interface RankedResult {
  slug: string
  title: string
  description: string
  folder: string
  tags: string[]
  /** Normalized score; higher is better. Equal scores fall back to slug order. */
  score: number
}

/**
 * Ordered relevance scores for the fixed field set, mirroring the existing
 * search plugin's title > tags > content weighting.
 */
export const FIELD_SCORES = Object.freeze({
  title: 30,
  tags: 20,
  content: 10,
} as const)

/**
 * Rank published pages against the filters.
 *
 * Scoring: exact title/full-tag/phrase matches score higher than partial
 * sub-token matches; field-level weights are title 30 > tags 20 > content
 * 10. Results are ordered by descending score and, deterministically, by
 * normalized slug ascending (the tie-breaker never depends on file-system
 * or modification order).
 */
export function rankEntries(
  entries: SearchIndexEntry[],
  filters: SearchFilters,
): RankedResult[] {
  const results: RankedResult[] = []
  for (const entry of entries) {
    if (!matchesFilters(entry, filters)) continue
    const slug = entry.slug ?? ""
    let score = 0

    if (filters.query) {
      const title = normalizeText(entry.title ?? "")
      if (title === filters.query) score += FIELD_SCORES.title * 3
      else if (title.startsWith(filters.query)) score += FIELD_SCORES.title * 2
      else if (title.includes(filters.query)) score += FIELD_SCORES.title

      const pageTags = tagListOf(entry)
      for (const tag of pageTags) {
        if (tag === filters.query) score += FIELD_SCORES.tags * 3
        else if (tag.startsWith(filters.query)) score += FIELD_SCORES.tags * 2
        else if (tag.includes(filters.query)) score += FIELD_SCORES.tags
      }

      const content = contentText(entry)
      if (content) {
        const normalized = normalizeText(content)
        if (normalized === filters.query) score += FIELD_SCORES.content * 3
        else if (normalized.includes(filters.query)) score += FIELD_SCORES.content
      }
    } else {
      score = 1
    }

    const rawTags = Array.isArray(entry.tags) ? entry.tags : []
    const tags = rawTags
      .filter((t): t is string => typeof t === "string" && t.trim() !== "")
      .map((t) => t.trim())

    const description =
      typeof entry.description === "string" && entry.description.trim()
        ? collapseSpaces(entry.description)
        : contentText(entry)
          ? collapseSpaces(contentText(entry)).slice(0, 120) || FALLBACK_DESCRIPTION
          : FALLBACK_DESCRIPTION

    results.push({
      slug,
      title: collapseSpaces(entry.title ?? slug) || slug,
      description,
      folder: pageFolder(slug),
      tags,
      score,
    })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
  })
  return results
}

/**
 * Filter + rank the whole index. The index itself is iterated in insertion
 * order, but the output is fully deterministic (see `rankEntries`).
 */
export function searchIndex(
  index: SearchIndex | null,
  filters: SearchFilters,
): RankedResult[] {
  if (!index || typeof index !== "object") return []
  return rankEntries(Object.values(index), filters)
}
