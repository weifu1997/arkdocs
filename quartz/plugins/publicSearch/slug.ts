/**
 * Isomorphic slug + heading utilities shared by the public search index and the
 * author local link checker.
 *
 * These mirror the canonical rules from `@quartz-community/utils`
 * (`slugifyFilePath` / `slugifyPath`) and Quartz's heading slugger, so that a
 * page, its slug, and its heading anchors can all be reasoned about offline
 * without importing the browser-facing plugin packages.
 */

/** Lowercase a string using the default Unicode-aware comparison (lowercase). */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

/**
 * Normalize a tag from frontmatter. Frontmatter tags are either strings or
 * arrays; array tags are handled by the caller. `folder/tag` style tags are
 * kept as-is so multi-level tags can be matched.
 */
export function normalizeTagValue(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTagValue(item)).filter((tag) => tag.length > 0)
  }
  const tag = String(value).trim().toLowerCase()
  return tag.length > 0 ? [tag] : []
}

/**
 * Slugify a single path segment the same way `@quartz-community/utils`
 * (`slugifyPath`) does: spaces -> "-", "&" -> "-and-", "%" -> "-percent", and
 * remove `?`, `#`, and Windows-forbidden characters, then lowercase.
 */
export function slugifySegment(segment: string): string {
  // Mirrors @quartz-community/utils `slugifyPath` segment transform exactly.
  return segment
    .replace(/\s/g, "-")
    .replace(/&/g, "-and-")
    .replace(/%/g, "-percent")
    .replace(/\?/g, "")
    .replace(/#/g, "")
    .replace(/[<>:"|*]/g, "")
    .toLowerCase()
}

/**
 * Slugify a whole file path (POSIX) including the `.md`/`.markdown` extension.
 *
 * Follows `@quartz-community/utils.slugifyFilePath`: every segment is slugified
 * and the last two identical segments are replaced with `index`. The resulting
 * slug is used verbatim as the URL slug — note that `index.md` keeps the slug
 * `"index"` (it is emitted as `index.html`, not `/`).
 */
export function slugifyFilePath(relativePath: string): string {
  const cleaned = relativePath.replace(/\\/g, "/").replace(/^\.?\/+/, "")
  const withoutExt = cleaned.replace(/\.(md|markdown)$/i, "")
  const segments = withoutExt
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(slugifySegment)

  // Deduplicate the last two segments (handles "_index" folder notes and
  // folder/folder.md Obsidian convention).
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
  }
  return segments.join("/")
}

/**
 * Slugify an Obsidian `tags/folder/tag` URL path segment. Multi-level tags use
 * `/` separators; each level is slugified with the same rules as file paths.
 */
export function slugTag(tag: string): string {
  return tag.split("/").map(slugifySegment).join("/")
}

/**
 * GitHub's heading slugger (used by Quartz for heading anchors):
 * remove non-alphanumerics (except spaces and dashes) and replace spaces
 * with dashes, then lowercase. CJK characters are treated as "word" characters
 * (matched by \w in Unicode mode) and are therefore kept.
 */
export function slugHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w一-鿿\s-]+/giu, "")
    .replace(/\s+/g, "-")
}

/**
 * Normalize the raw anchor from a Wikilink/Markdown link (anything after `#`).
 * Obsidian "block reference" anchors (`^abc`) and "heading block" anchors
 * (`#^...`) are handled by the caller; this only slugifies the visible heading
 * text.
 */
export function slugifyAnchor(anchor: string): string {
  return slugHeading(anchor)
}
