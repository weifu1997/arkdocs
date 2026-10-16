/**
 * Shared data model for the public `/search` feature.
 *
 * The author local link checker (`scripts/check-content.mjs`) consumes the same
 * slug and heading rules, so these types intentionally stay plain and isomorphic
 * (no DOM or Node dependencies).
 */

/** One searchable public page, written by `PublicSearchIndex` into `static/publicSearchIndex.json`. */
export interface PublicSearchEntry {
  /** Stable FullSlug used as the on-site link target, e.g. `features/folder-and-tag-listing`. */
  slug: string
  /** Page title; falls back to the slug-derived file name when the frontmatter title is missing. */
  title: string
  /** Short description; a fixed fallback is used when the page has no description. */
  description: string
  /** Normalized folder slug of the page, or empty for pages at the site root. */
  folder: string
  /** Normalized searchable body text (Quartz's stripped, HTML-safe text). */
  content: string
  /** Normalized tags (lowercase, trimmed). Empty set when the page has no tags. */
  tags: string[]
  /** Source relative file path, useful for diagnostics and tests. */
  filePath: string
}

export type PublicSearchIndex = Record<string, PublicSearchEntry>

export interface PublicSearchParams {
  /** Raw query text; empty when the user only wants to browse by tag/folder. */
  q: string
  /** All `tag` query values, kept in declaration order. */
  tags: string[]
  /** All `folder` query values, kept in declaration order. */
  folders: string[]
}

export interface PublicSearchMatch {
  entry: PublicSearchEntry
  /** Relevance score (higher is better). 0 when filtering only. */
  score: number
}
