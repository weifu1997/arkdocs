/**
 * Public content discovery for the `/search` route: URL parameter parsing,
 * query/tag/folder filtering and deterministic ranking.
 *
 * This module is pure logic shared between:
 * - the browser-side `/search` page script (quartz/search/search.inline.ts), and
 * - the offline content-discovery tests (fixtures/content-discovery).
 *
 * It deliberately does NOT re-parse Markdown: it operates on the published
 * entries emitted by the build-time Content Index (slugs, titles, tags,
 * searchable text). Draft, unlisted and ignored pages never reach this module.
 */

export interface SearchEntry {
  /** Canonical Quartz slug, e.g. `features/search` */
  slug: string
  title: string
  /** Display summary. Empty string when the index provides no description. */
  description: string
  /** Tags as written in frontmatter, already slug-normalized by the index. */
  tags: string[]
  /** Searchable text (build-time description or body text). */
  text: string
}

export interface SearchParams {
  /** Lowercase? No — trimmed raw query, matched case-insensitively. */
  q: string
  /** AND-tag list, already trimmed and case-normalized. */
  tags: string[]
  /** Normalized folder slug (exact case), or null when not filtering. */
  folder: string | null
}

/** CJK, Hiragana/Katakana and Hangul code-point ranges (same as the index encoder). */
function isCJKCode(code: number): boolean {
  return (
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0x20000 && code <= 0x2a6df)
  )
}

/** Whitespace code points (space, tab, LF, CR). */
function isWhitespaceCode(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13
}

/**
 * Whether a code point is neither a letter nor a digit, so it can separate
 * Latin/digit tokens. Hyphens, punctuation and whitespace are separators.
 */
function isTokenSeparator(code: number): boolean {
  if (isCJKCode(code)) return false
  if (isWhitespaceCode(code)) return true
  const char = String.fromCodePoint(code)
  if (/\p{L}/u.test(char) || /\p{N}/u.test(char)) return false
  return true
}

/**
 * Tokenize a query the same way the Content Index encoder does: CJK characters
 * are emitted one token per character (preserving substring matching), while
 * Latin letters and digits form tokens separated by any non-letter/non-digit
 * character (hyphen included).
 */
export function tokenize(value: string): string[] {
  const tokens: string[] = []
  let bufferStart = -1
  let bufferEnd = -1

  const lower = value.toLowerCase()
  let i = 0
  for (const char of lower) {
    const code = char.codePointAt(0)!
    if (isCJKCode(code)) {
      if (bufferStart !== -1) {
        tokens.push(lower.slice(bufferStart, bufferEnd))
        bufferStart = -1
      }
      tokens.push(char)
    } else if (isTokenSeparator(code)) {
      if (bufferStart !== -1) {
        tokens.push(lower.slice(bufferStart, bufferEnd))
        bufferStart = -1
      }
    } else {
      if (bufferStart === -1) bufferStart = i
      bufferEnd = i + char.length
    }
    i += char.length
  }
  if (bufferStart !== -1) tokens.push(lower.slice(bufferStart))
  return tokens
}

/** A token produced by `tokenize` is a CJK character when its code point is CJK. */
export function isCJKToken(token: string): boolean {
  return isCJKCode(token.codePointAt(0)!)
}

/**
 * Tag normalization for filtering: trim surrounding whitespace and compare
 * case-insensitively (e.g. " Feature " matches "feature").
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

export function folderFromSlug(slug: string): string {
  const index = slug.lastIndexOf("/")
  return index === -1 ? "" : slug.slice(0, index)
}

/**
 * Folder normalization: trim leading "./" or "/" and trailing slashes. Folder
 * slugs are matched exactly (the build index lowercases them); folders are
 * prefix-matched against the page's slug.
 */
export function normalizeFolder(folder: string): string | null {
  let normalized = folder.trim()
  if (!normalized) return null
  normalized = normalized.replace(/^\/+|\/+$/g, "")
  normalized = normalized
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
    .join("/")
  return normalized === "" ? null : normalized
}

/**
 * Parse `/search` URL parameters with URLSearchParams. `tag` may repeat and is
 * AND-combined; `folder` is normalized and prefix-matched; `q` is the raw query.
 * Malformed percent-encoding in `q`/`folder` yields undefined for the value
 * (URLSearchParams.get throws nothing — it decodes tolerantly), which callers
 * treat as "no such parameter" instead of crashing the script.
 */
export function parseSearchParams(input: string | URLSearchParams): SearchParams {
  // Accept either a URLSearchParams, a query string ("q=x&tag=y"), or a full
  // URL ("/search?q=x") — the path prefix must be stripped.
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(input.includes("?") ? input.slice(input.indexOf("?") + 1) : input)

  let q = params.get("q") ?? ""
  if (q === null) q = ""
  let folder: string | null
  try {
    folder = normalizeFolder(params.get("folder") ?? "")
  } catch {
    folder = null
  }
  return {
    q: q.trim(),
    tags: params
      .getAll("tag")
      .map(normalizeTag)
      .filter(Boolean),
    folder,
  }
}

/**
 * Build a `/search` URL from parameters. Repeated tags are appended in order
 * and all values are percent-encoded by URLSearchParams. Returns `/search`
 * (no prefix) when there are no parameters.
 */
export function buildSearchUrl(params: {
  q?: string
  tags?: string[]
  folder?: string | null
}): string {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  for (const tag of params.tags ?? []) search.append("tag", tag)
  if (params.folder) search.set("folder", params.folder)
  const query = search.toString()
  return query ? `/search?${query}` : "/search"
}

/** Query matching: every query token must appear in a searchable field. */
export function matchesQuery(entry: SearchEntry, q: string): boolean {
  const tokens = tokenize(q)
  if (tokens.length === 0) return true
  for (const token of tokens) {
    if (!fieldContains(entry, token)) return false
  }
  return true
}

function fieldContains(entry: SearchEntry, token: string): boolean {
  const needle = token.toLowerCase()
  if (isCJKToken(token)) {
    return (
      entry.title.toLowerCase().includes(needle) ||
      entry.description.toLowerCase().includes(needle) ||
      entry.text.toLowerCase().includes(needle) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(needle))
    )
  }
  // Latin/digit token: whole-token match with a non-alphanumeric boundary on
  // both sides, so "1" does not match inside "123" and "search" does not match
  // inside "research". Hyphens are already split by `tokenize`.
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}(?:[^\\p{L}\\p{N}]|$)`,
    "u",
  )
  return (
    pattern.test(entry.title) ||
    pattern.test(entry.description) ||
    pattern.test(entry.text) ||
    entry.tags.some((tag) => pattern.test(tag))
  )
}

/** Tag filtering: AND over tags, case-insensitive after trimming. */
export function matchesTags(entry: SearchEntry, requiredTags: string[]): boolean {
  if (requiredTags.length === 0) return true
  const available = entry.tags.map(normalizeTag)
  for (const required of requiredTags) {
    if (!available.includes(required)) return false
  }
  return true
}

/** Folder filtering: match the folder itself and every subdirectory. */
export function matchesFolder(entry: SearchEntry, folder: string | null): boolean {
  if (!folder) return true
  return entry.slug === folder || entry.slug.startsWith(folder + "/")
}

/**
 * Relevance score used to order results. Fields and weights: title (3), tag
 * (1), description (1), body text (1). CJK tokens score by code-point count
 * (substring presence); Latin/digit tokens score per whole-token hit. A page
 * that contains the same query in more fields scores higher. The same query on
 * two pages whose text contains it the same number of times yields the same
 * score, so the slug tie-breaker decides the final order.
 */
export function scoreQuery(entry: SearchEntry, q: string): number {
  const tokens = tokenize(q)
  if (tokens.length === 0) return 0
  let score = 0
  for (const token of tokens) {
    score += weightedHits(entry, token, "title", 3)
    score += weightedHits(entry, token, "tags", 1)
    score += weightedHits(entry, token, "description", 1)
    score += weightedHits(entry, token, "text", 1)
  }
  return score
}

function weightedHits(entry: SearchEntry, token: string, field: string, weight: number): number {
  const values: string[] =
    field === "tags"
      ? entry.tags
      : [field === "title" ? entry.title : entry[field as "description" | "text"] ?? ""]
  let hits = 0
  for (const value of values) {
    if (!value) continue
    hits += occurrences(value, token)
  }
  return hits * weight
}

function occurrences(value: string, token: string): number {
  const haystack = value.toLowerCase()
  const needle = token.toLowerCase()
  if (isCJKToken(token)) {
    let count = 0
    let index = haystack.indexOf(needle)
    while (index !== -1) {
      count += 1
      index = haystack.indexOf(needle, index + needle.length)
    }
    return count
  }
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(needle)}(?:[^\\p{L}\\p{N}]|$)`,
    "gu",
  )
  const matches = haystack.match(pattern)
  return matches ? matches.length : 0
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Deterministic slug ordering used both for ranking ties and no-query lists. */
export function compareSlug(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * Filter published entries by query/tag/folder and order them. With a query,
 * results are ordered by descending relevance score and slug ascending; without
 * a query, results are ordered by slug ascending. Slug ascending ties make the
 * ordering independent of file-system traversal order or modification time.
 */
export function searchEntries(entries: SearchEntry[], params: SearchParams): SearchEntry[] {
  const matched = entries.filter(
    (entry) =>
      matchesQuery(entry, params.q) &&
      matchesTags(entry, params.tags) &&
      matchesFolder(entry, params.folder),
  )
  if (params.q.trim()) {
    matched.sort(
      (a, b) => scoreQuery(b, params.q) - scoreQuery(a, params.q) || compareSlug(a.slug, b.slug),
    )
  } else {
    matched.sort((a, b) => compareSlug(a.slug, b.slug))
  }
  return matched
}
