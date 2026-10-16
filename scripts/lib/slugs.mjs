/**
 * Quartz-compatible slug and link-resolution logic, ported from
 * @quartz-community/utils (slugifyFilePath, slugTag, splitAnchor,
 * transformInternalLink, the shortest-resolution candidate selection in
 * transformLink, and github-slugger heading slugs).
 *
 * The checker reproduces the build-time rule so a link that would resolve
 * in the built site is never reported, while a truly missing target is.
 */
import { slug } from "github-slugger"
import nodePath from "node:path"

export const ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".pdf",
  ".mp3",
  ".mp4",
  ".wav",
  ".webm",
  ".ogg",
  ".canvas",
  ".base",
])

/** Lowercase, non-empty segments only. */
export function isFilePath(s) {
  const validStart = !s.startsWith(".")
  return validStart && /\.[A-Za-z0-9]+$/.test(s)
}

/** stripSlashes(port from the plugin): one leading, one trailing slash. */
export function stripSlashes(s, onlyStripPrefix = false) {
  if (s.startsWith("/")) s = s.slice(1)
  if (!onlyStripPrefix && s.endsWith("/")) s = s.slice(0, -1)
  return s
}

export function endsWith(s, suffix) {
  return s === suffix || s.endsWith("/" + suffix)
}

export function trimSuffix(s, suffix) {
  if (endsWith(s, suffix)) s = s.slice(0, -suffix.length)
  return s
}

export function getFileExtension(s) {
  return s.match(/\.[A-Za-z0-9]+$/)?.[0] ?? ""
}

export function isFolderPath(s) {
  return (
    s.endsWith("/") || endsWith(s, "index") || endsWith(s, "index.md") || endsWith(s, "index.html")
  )
}

export function isRelativeURL(s) {
  const validStart = /^\.{1,2}/.test(s)
  const validEnd = !endsWith(s, "index")
  return validStart && validEnd && ![".md", ".html"].includes(getFileExtension(s) ?? "")
}

export function isAbsoluteURL(s) {
  try {
    new URL(s)
  } catch {
    return false
  }
  return true
}

export function simplifySlug(fp) {
  const res = trimSuffix(fp, "index")
  return res.length === 0 ? "/" : res
}

export function pathToRoot(slugStr) {
  const root = slugStr
    .split("/")
    .filter((x) => x !== "")
    .slice(0, -1)
    .map((_) => "..")
    .join("/")
  return root.length === 0 ? "." : root
}

export function joinSegments(...args) {
  if (args.length === 0) return ""
  let joined = args
    .filter((segment) => segment !== "" && segment !== "/")
    .map(stripSlashes)
    .join("/")
  const first = args[0]
  const last = args[args.length - 1]
  if (first?.startsWith("/")) joined = "/" + joined
  if (last?.endsWith("/")) joined = joined + "/"
  return joined
}

export function resolveRelative(current, target) {
  return joinSegments(pathToRoot(current), simplifySlug(target))
}

export function getAllSegmentPrefixes(path) {
  const segments = path.split("/")
  const results = []
  for (let i = 0; i < segments.length; i++) results.push(segments.slice(0, i + 1).join("/"))
  return results
}

const _isRelativeSegment = (s) => /^\.{0,2}$/.test(s)

const _addRelativeToStart = (s) => (s === "" ? "." : s.startsWith(".") ? s : joinSegments(".", s))

function slugifyPath(s) {
  return s
    .split("/")
    .map((segment) =>
      segment
        .replace(/\s/g, "-")
        .replace(/&/g, "-and-")
        .replace(/%/g, "-percent")
        .replace(/\?/g, "")
        .replace(/#/g, "")
        .replace(/[<>:"|*]/g, "")
        .toLowerCase(),
    )
    .join("/")
    .replace(/\/$/, "")
}

export function slugifyFilePath(fp, excludeExt) {
  fp = stripSlashes(fp)
  const ext = getFileExtension(fp)
  const withoutFileExt = fp.replace(new RegExp(ext + "$"), "")
  const finalExt = excludeExt || [".md", ".html", ""].includes(ext) ? "" : ext
  let slugStr = slugifyPath(withoutFileExt)
  if (endsWith(slugStr, "_index")) slugStr = slugStr.replace(/_index$/, "index")
  const segments = slugStr.split("/")
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
    slugStr = segments.join("/")
  }
  return slugStr + (finalExt ?? "")
}

export function slugTag(tag) {
  return tag
    .split("/")
    .map((segment) => slugifyPath(segment))
    .join("/")
}

export function splitAnchor(link) {
  const [fp, anchor] = link.split("#", 2)
  if (fp.endsWith(".pdf")) {
    return [fp, anchor === void 0 ? "" : "#" + anchor]
  }
  if (anchor === void 0) return [fp, ""]
  const bare = anchor.startsWith("^") ? anchor.slice(1) : anchor
  return [fp, "#" + slug(bare)]
}

/**
 * Resolve a single page link target (Wikilink or Markdown link) against the
 * known page set using Quartz's shortest strategy.
 *
 * Returns `{ slug: string, anchor: string }` when a page resolves, or
 * `{ slug: null, anchor: string }` when no page matches.
 */
export function resolvePageTarget(rawTarget, currentSlug, allSlugs) {
  const decoded = decodeURIComponent(rawTarget)
  const [fplike, anchor] = splitAnchor(decoded)
  // Anchor-only link (`#anchor`): the page is the current page; the caller
  // verifies the heading against the current document's anchors.
  if (!fplike || fplike === "/" || fplike === "." || fplike === "./") {
    return { slug: currentSlug, anchor }
  }

  const segments = fplike.split("/").filter((x) => x.length > 0)
  const prefix = segments.filter((seg) => _isRelativeSegment(seg)).join("/")
  const fp = segments.filter((seg) => !_isRelativeSegment(seg) && seg !== "").join("/")
  const slugged = slugifyFilePath(fp)
  const simpleSlug = simplifySlug(slugged)
  const folderPath = isFolderPath(fplike) || isFolderPath(slugged)

  // Same-page anchor (`#anchor`) or same-relative (`./#anchor`): the page is
  // the current one; the caller verifies the heading against the current
  // document.
  if (!simpleSlug || simpleSlug === "." || simpleSlug === currentSlug) {
    return { slug: currentSlug, anchor }
  }

  const effectiveSrc =
    !endsWith(currentSlug, "index") && allSlugs.has(`${currentSlug}/index`)
      ? `${currentSlug}/index`
      : currentSlug

  const base = pathToRoot(effectiveSrc)
  const joined = joinSegments(prefix, simpleSlug)
  // Directory references (`cli/index`, `advanced/`, `./features/`) resolve to
  // the virtual folder page `<folder>/index`. Match the bare directory slug and
  // the "/index" virtual page, plus the relative path for shortest-name.
  const candidates = [joinSegments(base, joined)]
  if (folderPath) {
    const dirSlug = simpleSlug.replace(/\/$/, "")
    candidates.push(dirSlug)
    candidates.push(joinSegments(dirSlug, "index"))
  }
  if (simpleSlug) {
    const matches = []
    for (const known of allSlugs) {
      if (simpleSlug.includes("/")) {
        if (known === simpleSlug || known.endsWith("/" + simpleSlug)) matches.push(known)
        if (
          folderPath &&
          (known === `${simpleSlug}/index` || known.endsWith(`/${simpleSlug}/index`))
        )
          matches.push(known)
      } else {
        const fileName = known.split("/").pop()
        if (simpleSlug === fileName) matches.push(known)
      }
    }
    // Dedupe while preserving order.
    for (const known of matches) if (!candidates.includes(known)) candidates.push(known)
  }

  const resolved = candidates.find((candidate) => allSlugs.has(candidate))
  return { slug: resolved ?? null, anchor }
}

/**
 * Resolve the slug for an anchor-only link (`#anchor`) on the current page.
 */
export function resolveAnchorOnly(rawTarget, currentSlug) {
  const decoded = decodeURIComponent(rawTarget)
  const [fplike, anchor] = splitAnchor(decoded)
  if (fplike) return null
  return { slug: currentSlug, anchor }
}

/**
 * Resolve a local asset reference. The build's shortest strategy also accepts
 * bare image names by searching from the current folder up through the content
 * tree (the Obsidian/Quartz media lookup). Returns the relative POSIX path
 * when the file exists, or null.
 */
export function resolveAssetTarget(rawTarget, currentRelPath, rootDir, fs, allFiles = []) {
  const target = decodeURIComponent(rawTarget).split("?")[0] ?? ""
  if (!target) return null

  // Absolute/root-relative reference.
  if (target.startsWith("/")) {
    const absolute = nodePath.join(rootDir, target.slice(1))
    return fs.existsSync(absolute)
      ? nodePath.posix.normalize(nodePath.posix.join("/", target.slice(1)))
      : null
  }

  // Relative reference from the source file.
  const relative = nodePath.join(nodePath.posix.dirname(currentRelPath), target)
  if (fs.existsSync(nodePath.join(rootDir, relative))) {
    return nodePath.posix.normalize(relative)
  }

  // Bare name search: resolve by slugified basename anywhere in the source
  // tree (Obsidian/Quartz shortest-name resolution). The wikilink name is
  // slugified when linked, while the file keeps its on-disk name.
  const targetBase = target.split("/").pop().toLowerCase().replace(/\s/g, "-")
  const matches = allFiles.filter((file) => {
    const fileBase = file.split("/").pop().toLowerCase().replace(/\s/g, "-")
    return fileBase === targetBase
  })
  if (matches.length === 0) return null
  const winner = matches[0]
  return nodePath.posix.relative(nodePath.posix.dirname(currentRelPath), winner)
}
