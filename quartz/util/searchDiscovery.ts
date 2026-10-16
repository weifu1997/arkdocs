// Public /search data contract: URL params, filter normalization and
// deterministic ranking for the route-based public search page.
//
// The browser never re-parses Markdown here. Functions operate on the
// published ContentIndex (static/contentIndex.json), which contains only
// published pages (drafts, unlisted pages and ignored/ private pages are
// excluded before the index is emitted).

export interface SearchEntry {
  slug: string
  title: string
  content: string
  tags: string[]
}

export interface SearchFilters {
  /** Raw query string, may be empty. */
  query: string
  /** Normalized tag set for AND matching (trimmed, lower-cased). */
  tags: string[]
  /** Normalized folder path (trimmed, lower-cased, no leading/trailing slash). */
  folder: string
}

export const INITIAL_HINT = "输入搜索词，或按标签/文件夹筛选。"
export const NO_RESULTS = "没有匹配结果。"
export const INDEX_LOAD_FAILED = "搜索索引加载失败。"
export const INDEX_MISSING = "搜索索引不存在。"

/** Canonicalise a tag from URL filters: trim whitespace, collapse internal spaces. */
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ").toLowerCase()
}

/** Canonicalise a folder path: backslashes, leading "./", case, trailing slash. */
export function normalizeFolder(folder: string): string {
  let value = folder.replaceAll("\\", "/").trim()
  // URLSearchParams already applies URL decoding; normalize leading "./" segments.
  value = value.replace(/^\.\//g, "").replace(/^\.?\//, "")
  value = value.replace(/\/+$/, "").replace(/^\/+/, "").toLowerCase()
  return value
}

/** Split a query on whitespace into lower-cased search terms. */
export function splitQueryTerms(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)
}

/**
 * Read filters from a URL search string (e.g. "?q=...&tag=a&folder=f").
 * Tags repeat as `tag` parameters and are ANDed. Unknown/empty tags keep the
 * comparison contract (they simply never match a page). Malformed encoded
 * values never throw: they are compared literally against page data.
 */
export function readFilters(search: string): SearchFilters {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const query = params.get("q") ?? ""
  const tags: string[] = []
  for (const value of params.getAll("tag")) {
    const tag = normalizeTag(value)
    if (tag.length > 0 && !tags.includes(tag)) tags.push(tag)
  }
  const rawFolder = params.get("folder") ?? ""
  return { query, tags, folder: normalizeFolder(rawFolder) }
}

/** Build a search URL path (with basePath handled by the caller). */
export function buildSearchPath(filters: SearchFilters, basePath = ""): string {
  const params = new URLSearchParams()
  if (filters.query) params.append("q", filters.query)
  for (const tag of filters.tags) params.append("tag", tag)
  if (filters.folder) params.append("folder", filters.folder)
  const queryString = params.toString()
  const prefix = basePath && !basePath.endsWith("/") ? `${basePath}/` : `${basePath}`
  return `${prefix}search${queryString ? `?${queryString}` : ""}`
}

/**
 * Return true when the entry passes every active filter criterion.
 * A folder matches the folder page itself (`features/index`) and every page
 * under it; it never matches sibling folders such as `features-other/`.
 */
export function entryMatches(entry: SearchEntry, filters: SearchFilters): boolean {
  const entryTags = (entry.tags ?? []).map((tag) => normalizeTag(tag))
  for (const wantedTag of filters.tags) {
    if (!entryTags.includes(wantedTag)) return false
  }
  if (filters.folder) {
    const folder = filters.folder
    if (entry.slug !== folder && !entry.slug.startsWith(`${folder}/`)) return false
  }
  return true
}

/** Rank a filter-candidate set against the query terms. */
export function rankEntries(
  entries: SearchEntry[],
  filters: SearchFilters,
): Array<{ entry: SearchEntry; score: number }> {
  const terms = splitQueryTerms(filters.query)
  // Empty query with no filters: the page shows its initial state instead of
  // listing every published page.
  if (terms.length === 0 && filters.tags.length === 0 && filters.folder.length === 0) {
    return []
  }
  const ranked = entries
    .filter((entry) => entryMatches(entry, filters))
    .map((entry) => {
      let score = 0
      if (terms.length > 0) {
        const haystack = `${entry.title} ${entry.content} ${(entry.tags ?? []).join(" ")}`.toLowerCase()
        for (const term of terms) {
          score += haystack.includes(term) ? 1 : 0
        }
      }
      return { entry, score }
    })
    // A query with no matching term produces no results; an empty query with
    // filters keeps every filtered page (score 0) for a deterministic listing.
    .filter(({ score }) => terms.length === 0 || score > 0)
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.entry.slug.localeCompare(b.entry.slug, "en", { sensitivity: "base" })
  })
  return ranked
}

/** Normalise an arbitrary (possibly malformed) search string defensively. */
export function safeReadFilters(search: string): SearchFilters {
  try {
    return readFilters(search)
  } catch {
    return { query: "", tags: [], folder: "" }
  }
}
