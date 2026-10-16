// Public /search page client. It does not re-parse Markdown; it reads the
// published ContentIndex (static/contentIndex.json) which is emitted for
// published pages only, and applies tag/folder filters driven by URL params:
//
//   /search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>

import {
  readFilters,
  rankEntries,
  normalizeTag,
  INITIAL_HINT,
  NO_RESULTS,
  INDEX_LOAD_FAILED,
} from "../../util/searchDiscovery"

type IndexEntry = {
  slug: string
  title: string
  content: string
  tags: string[]
}

const FALLBACK_SUMMARY = "（暂无摘要）"
const SUMMARY_LENGTH = 140

function readIndex(): Promise<Record<string, IndexEntry>> {
  return fetchData.then((value) => value as unknown as Record<string, IndexEntry>)
}

function toEntries(index: Record<string, IndexEntry>): IndexEntry[] {
  return Object.entries(index).map(([slug, data]) => ({
    slug,
    title: (data && data.title) ?? "",
    content: (data && data.content) ?? "",
    tags: (data && data.tags) ?? [],
  }))
}

function folderOf(slug: string): string {
  const parts = slug.split("/")
  parts.pop()
  return parts.filter(Boolean).join("/")
}

function excerpt(text: string): string {
  const compact = (text ?? "").replace(/\s+/g, " ").trim()
  if (!compact) return FALLBACK_SUMMARY
  return compact.length <= SUMMARY_LENGTH ? compact : `${compact.slice(0, SUMMARY_LENGTH)}…`
}

function baseHref(path: string): string {
  const basePath = document.body?.dataset?.basepath ?? ""
  return `${basePath}${basePath.length > 0 && !basePath.endsWith("/") ? "/" : ""}${path}`.replace(
    /\/+/g,
    "/",
  )
}

function resultCard(entry: IndexEntry): HTMLLIElement {
  const li = document.createElement("li")
  li.className = "search-page-result"

  const a = document.createElement("a")
  a.className = "search-page-link"
  a.href = baseHref(entry.slug)

  const h3 = document.createElement("h3")
  h3.className = "search-page-link-title"
  h3.textContent = entry.title || entry.slug

  const pSummary = document.createElement("p")
  pSummary.className = "search-page-summary"
  pSummary.textContent = excerpt(entry.content)

  const pPath = document.createElement("p")
  pPath.className = "search-page-path"
  pPath.textContent = folderOf(entry.slug) || "/"

  const ulTags = document.createElement("ul")
  ulTags.className = "search-page-tags"
  for (const tag of entry.tags) {
    const liTag = document.createElement("li")
    const pTag = document.createElement("p")
    pTag.textContent = `#${tag}`
    liTag.appendChild(pTag)
    ulTags.appendChild(liTag)
  }

  a.appendChild(h3)
  a.appendChild(pSummary)
  a.appendChild(pPath)
  if (ulTags.children.length > 0) a.appendChild(ulTags)

  li.appendChild(a)
  return li
}

function render(filters: ReturnType<typeof readFilters>, entries: IndexEntry[] | null): void {
  const status = document.getElementById("search-page-status")
  const results = document.getElementById("search-page-results")
  if (!status || !results) return
  results.textContent = ""

  if (entries === null) {
    status.textContent = INDEX_LOAD_FAILED
    return
  }

  const hasQuery = filters.query.length > 0
  const hasFilter = filters.tags.length > 0 || filters.folder.length > 0
  if (!hasQuery && !hasFilter) {
    status.textContent = INITIAL_HINT
    return
  }

  const ranked = rankEntries(entries, filters)
  if (ranked.length === 0) {
    status.textContent = NO_RESULTS
    return
  }

  status.textContent = ""
  const frag = document.createDocumentFragment()
  for (const { entry } of ranked) frag.appendChild(resultCard(entry))
  results.appendChild(frag)
}

function applyURL(): void {
  const queryInput = document.getElementById("search-page-query") as HTMLInputElement | null
  const tagInput = document.getElementById("search-page-tag") as HTMLInputElement | null
  const folderInput = document.getElementById("search-page-folder") as HTMLInputElement | null
  const filters = readFilters(window.location.search)
  if (queryInput && document.activeElement !== queryInput) queryInput.value = filters.query
  if (tagInput && document.activeElement !== tagInput) {
    tagInput.value = filters.tags.join(", ")
  }
  if (folderInput && document.activeElement !== folderInput) {
    folderInput.value = filters.folder
  }
  if (typeof fetchData === "undefined") {
    render(filters, null)
    return
  }
  readIndex()
    .then((index) => render(filters, toEntries(index)))
    .catch(() => render(filters, null))
}

function syncURLFromInputs(): void {
  const queryInput = document.getElementById("search-page-query") as HTMLInputElement | null
  const tagInput = document.getElementById("search-page-tag") as HTMLInputElement | null
  const folderInput = document.getElementById("search-page-folder") as HTMLInputElement | null
  const params = new URLSearchParams(window.location.search)
  if (queryInput?.value.trim()) params.set("q", queryInput.value.trim())
  else params.delete("q")
  params.delete("tag")
  const tags = new Set<string>()
  tagInput?.value.split(",").forEach((raw) => {
    const tag = normalizeTag(raw)
    if (tag) tags.add(tag)
  })
  for (const tag of tags) params.set("tag", tag)
  const folder = (folderInput?.value ?? "").trim().replaceAll("\\", "/")
  if (folder) params.set("folder", folder)
  else params.delete("folder")

  const queryString = params.toString()
  const target = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`
  window.history.replaceState({}, "", target)
  applyURL()
}

function bindControls(): void {
  if (document.getElementById("search-page-results") === null) return

  const queryInput = document.getElementById("search-page-query") as HTMLInputElement | null
  const tagInput = document.getElementById("search-page-tag") as HTMLInputElement | null
  const folderInput = document.getElementById("search-page-folder") as HTMLInputElement | null
  const clearButton = document.getElementById("search-page-clear")

  for (const input of [queryInput, tagInput, folderInput]) {
    if (input) input.addEventListener("input", syncURLFromInputs)
  }
  clearButton?.addEventListener("click", () => {
    window.history.replaceState({}, "", `${window.location.pathname}`)
    applyURL()
  })

  applyURL()
}

// The existing toolbar search entry keeps its button element and keyboard
// shortcuts, but a plain click (or tap) enters the logical /search route
// instead of the in-page modal. The modal remains available via the
// ⌘K / ⌘R shortcut (and ⌘⇧K for tag mode) on every page, including /search
// (where the /search body itself handles clicks on the button normally).
function bindSearchEntry(): void {
  document.addEventListener(
    "click",
    (event) => {
      const button = (event.target as HTMLElement).closest?.(".search-button") as HTMLElement | null
      if (!button) return
      // On the /search page the in-page controls take precedence; let the
      // existing modal handler run (do not re-navigate).
      if (button.closest(".search-page")) return
      // Preserve browser defaults for modified/new-tab clicks.
      if (event.defaultPrevented || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const url = new URL(
        `${document.body?.dataset?.basepath ?? ""}/search`,
        window.location.href,
      )
      window.spaNavigate(url, false)
    },
    true,
  )
}

if (typeof document !== "undefined") {
  // Initial render (the component only renders on /search). SPA navigation to
  // or from the page reuses this binding via the "nav" / "render" events.
  bindControls()
  document.addEventListener("nav", () => bindControls())
  document.addEventListener("render", () => bindControls())
  bindSearchEntry()
}

// Inline scripts are shipped as text at build time; the esbuild inline loader
// strips this export, while plain ESM consumers (and the test harness) resolve
// the module through it without touching the DOM.
export default void 0
