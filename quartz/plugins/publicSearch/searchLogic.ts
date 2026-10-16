/**
 * Isomorphic matching/scoring logic for `/search` filtering.
 *
 * Kept free of any DOM or Node APIs so the same rules can be unit-tested on
 * Node and executed in the browser. The public `/search` page, the
 * `test:content-discovery` suite, and the author link checker all rely on
 * these deterministic rules.
 */

import type { PublicSearchEntry, PublicSearchMatch, PublicSearchParams } from "./types"

/**
 * CJK-aware tokenizer. Latin/digit text is grouped into tokens separated by
 * whitespace; CJK code points (Chinese, Japanese, Korean) are emitted one
 * character per token so that Chinese substring queries can match. This mirrors
 * the existing `@quartz-community/search` encoder used by the legacy modal.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  const lower = (text ?? "").toLowerCase()

  let bufferStart = -1

  const flush = (end: number) => {
    if (bufferStart !== -1) {
      tokens.push(lower.slice(bufferStart, end))
      bufferStart = -1
    }
  }

  let i = 0
  for (const char of lower) {
    const code = char.codePointAt(0)!
    const isCJK =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    const isWhitespace = code === 32 || code === 9 || code === 10 || code === 13

    if (isCJK || isWhitespace) {
      flush(i)
      if (isCJK) tokens.push(char)
    } else if (bufferStart === -1) {
      bufferStart = i
    }

    i += char.length
  }

  flush(lower.length)
  return tokens.filter((token) => token.length > 0)
}

/** Normalize a tag value from the URL: lowercase + trim, supporting spaces. */
export function normalizeUrlTag(tag: string): string {
  return tag.trim().toLowerCase()
}

/**
 * Normalize a folder value from the URL: decode, strip a leading/trailing
 * slash, lowercase. Folder comparison in the checker uses the slugified
 * directory name, so the comparison here works on decoded folder paths and
 * matches the page's folder field which is also slugified.
 */
export function normalizeUrlFolder(folder: string): string {
  return folder
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
}

/** Parse `?q=&tag=&tag=&folder=&folder=` via `URLSearchParams` without crashing on malformed input. */
export function parseSearchParams(params: URLSearchParams): PublicSearchParams {
  return {
    q: params.get("q") ?? "",
    tags: (params.getAll("tag") ?? []).map(normalizeUrlTag),
    folders: (params.getAll("folder") ?? []).map(normalizeUrlFolder),
  }
}

/**
 * Does a page belong to the given folder? The folder value matches the page's
 * slug prefix so that `folder=features` matches `features/` and everything
 * under it (e.g. `features/full-text-search`), but never a sibling directory
 * like `getting-started`. A page at root has an empty folder.
 */
export function pageInFolder(entry: PublicSearchEntry, folder: string): boolean {
  const page = entry.folder
  if (!folder) return true
  return page === folder || page.startsWith(folder + "/")
}

/** Does a page carry the given tag? Tags are normalized on both sides. */
export function pageHasTag(entry: PublicSearchEntry, tag: string): boolean {
  if (!tag) return true
  return entry.tags.includes(tag)
}

/** Whether the page matches the query on any field (title/tag/content). */
export function entryMatchesQuery(entry: PublicSearchEntry, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true
  const title = entry.title.toLowerCase()
  const content = entry.content.toLowerCase()
  return queryTokens.some((token) => {
    if (token.length === 0) return false
    return (
      title.includes(token) ||
      entry.tags.some((tag) => tag.includes(token)) ||
      content.includes(token)
    )
  })
}

/**
 * Score a single entry against the query. Tags AND folders are applied as
 * hard filters (they do not score). Among entries that pass the filters AND
 * match the query, the first query token gets 3 weight units if its title
 * contains it (case insensitive), 2 if it appears in a tag, 1 if it appears in
 * the body; each additional query token gets the next weight. When the query is
 * empty the score is 0 for every passing entry.
 */
export function scoreEntry(entry: PublicSearchEntry, queryTokens: string[]): number {
  let score = 0
  if (queryTokens.length === 0) return 0

  const title = entry.title.toLowerCase()
  const content = entry.content.toLowerCase()

  queryTokens.forEach((token, index) => {
    if (token.length === 0) return
    if (title.includes(token)) score += 3 - index
    else if (entry.tags.some((tag) => tag.includes(token))) score += 2 - index
    else if (content.includes(token)) score += 1 - index
  })

  return score
}

/** Deterministic tie-breaker: relevance desc, then normalized slug asc. */
function compareByScore(a: PublicSearchMatch, b: PublicSearchMatch): number {
  if (b.score !== a.score) return b.score - a.score
  return a.entry.slug < b.entry.slug ? -1 : a.entry.slug > b.entry.slug ? 1 : 0
}

/**
 * Filter and score an index against parsed params. Always returns a fresh array
 * (sort/score), without mutating the index. Multiple `tag` values are ANDed;
 * multiple `folder` values are ANDed (a page must be in every requested folder);
 * tags and folders together are ANDed.
 */
export function searchIndex(
  index: Record<string, PublicSearchEntry>,
  params: PublicSearchParams,
): PublicSearchMatch[] {
  const queryTokens = tokenize(params.q)
  const results: PublicSearchMatch[] = []

  for (const entry of Object.values(index)) {
    if (params.tags.some((tag) => !pageHasTag(entry, tag))) continue
    if (params.folders.some((folder) => !pageInFolder(entry, folder))) continue
    // A non-empty query only includes pages that match at least one term.
    if (!entryMatchesQuery(entry, queryTokens)) continue
    results.push({ entry, score: scoreEntry(entry, queryTokens) })
  }

  return results.sort(compareByScore)
}

/** Whether params select a page by tag/folder (used to decide the initial state). */
export function hasFilter(params: PublicSearchParams): boolean {
  return params.tags.length > 0 || params.folders.length > 0
}

/** Whether there is an actual query term (non-whitespace). */
export function hasQuery(params: PublicSearchParams): boolean {
  return params.q.trim().length > 0
}
