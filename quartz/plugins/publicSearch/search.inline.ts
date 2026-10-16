/**
 * Client-side script for the public `/search` feature.
 *
 * Two roles:
 *
 * 1. **Entry re-routing (every page):** the existing `@quartz-community/search`
 *    toolbar button and the `Ctrl/Cmd+K` shortcut open a modal. This script
 *    intercepts them in the capture phase and instead navigates to `/search`
 *    (the public filtering page), preserving the entry and shortcut.
 *
 * 2. **`/search` page (when `data-slug` is `search`):** reads `?q=&tag=&tag=
 *    &folder=&folder=` via `URLSearchParams`, renders the filter UI, fetches the
 *    build-generated `static/publicSearchIndex.json` (resolved against
 *    `data-basepath` so the `baseUrl`/`baseDir` prefix is honored), and applies
 *    the deterministic filters/scoring. It also keeps the URL in sync.
 *
 * The scoring/filtering lives in `searchLogic.ts` (shared with the test suite);
 * this file only wires the DOM and the URL.
 */

interface SearchEntry {
  slug: string
  title: string
  description: string
  folder: string
  content: string
  tags: string[]
}

type SearchIndex = Record<string, SearchEntry>

interface Match {
  entry: SearchEntry
  score: number
}

const INDEX_FILE = "static/publicSearchIndex.json"

function getBasePath(): string {
  return (document.body?.dataset?.basepath ?? "") as string
}

function isSearchPage(): boolean {
  return document.body?.dataset?.slug === "search"
}

function withBase(rel: string): string {
  const base = getBasePath()
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base
  return `${prefix}/${rel}`
}

/** Navigate to the `/search` page (SPA-aware when the router is present). */
function goToSearch(query?: string, tags?: string[], folders?: string[]): void {
  const base = getBasePath()
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  for (const tag of tags ?? []) if (tag) params.append("tag", tag)
  for (const folder of folders ?? []) if (folder) params.append("folder", folder)
  const suffix = params.toString()
  const url = `${base || "/"}search${suffix ? `?${suffix}` : ""}`
  const target = new URL(url, window.location.origin)

  // The SPA router exposes window.spaNavigate; fall back to a hard navigation.
  const navigate = (window as unknown as { spaNavigate?: (u: URL) => void }).spaNavigate
  if (typeof navigate === "function") {
    try {
      navigate(target)
      return
    } catch {
      // fall through to location.assign
    }
  }
  window.location.assign(target.toString())
}

/**
 * Return the search button element rendered by `@quartz-community/search` on
 * this page. Guarded so unknown DOM shapes never throw.
 */
function findSearchButtons(): Element[] {
  const buttons: Element[] = []
  document.querySelectorAll(".search-button").forEach((button) => {
    buttons.push(button)
  })
  return buttons
}

/** Capture-phase click interceptor: open `/search` instead of the modal. */
function wireEntryInterceptor(): void {
  document.addEventListener(
    "click",
    (event: MouseEvent) => {
      if (isSearchPage()) return
      const target = event.target as Element | null
      if (!target) return
      const button = target.closest?.(".search-button")
      if (!button) return
      event.preventDefault()
      event.stopImmediatePropagation()
      event.stopPropagation()
      goToSearch()
    },
    true,
  )

  // Preserve the Ctrl/Cmd+K shortcut, but route it to /search.
  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      if (isSearchPage()) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.shiftKey) {
        event.preventDefault()
        event.stopImmediatePropagation()
        event.stopPropagation()
        goToSearch()
      }
    },
    true,
  )
}

interface State {
  index: SearchIndex | null
  loadError: boolean
  q: string
  tags: string[]
  folders: string[]
  // The alphabetically-sorted unique tags present in the index, for the picker.
  allTags: string[]
}

function parseParams(): { q: string; tags: string[]; folders: string[] } {
  try {
    const params = new URL(window.location.toString()).searchParams
    return {
      q: params.get("q") ?? "",
      tags: params.getAll("tag").map((t) => t.trim().toLowerCase()),
      folders: params.getAll("folder").map((f) =>
        f
          .trim()
          .replace(/^\/+|\/+$/g, "")
          .toLowerCase(),
      ),
    }
  } catch {
    return { q: "", tags: [], folders: [] }
  }
}

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const lower = (text ?? "").toLowerCase()
  let start = -1
  let i = 0
  for (const char of lower) {
    const code = char.codePointAt(0)!
    const isCJK =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    const isSpace = code === 32 || code === 9 || code === 10 || code === 13
    if (isCJK || isSpace) {
      if (start !== -1) {
        tokens.push(lower.slice(start, i))
        start = -1
      }
      if (isCJK) tokens.push(char)
    } else {
      if (start === -1) start = i
    }
    i += char.length
  }
  if (start !== -1) tokens.push(lower.slice(start))
  return tokens.filter((t) => t.length > 0)
}

function score(entry: SearchEntry, queryTokens: string[]): number {
  let score = 0
  if (queryTokens.length === 0) return 0
  const title = entry.title.toLowerCase()
  const content = entry.content.toLowerCase()
  queryTokens.forEach((token, index) => {
    if (!token) return
    if (title.includes(token)) score += 3 - index
    else if (entry.tags.some((t) => t.includes(token))) score += 2 - index
    else if (content.includes(token)) score += 1 - index
  })
  return score
}

function pageInFolder(entry: SearchEntry, folder: string): boolean {
  if (!folder) return true
  return entry.folder === folder || entry.folder.startsWith(`${folder}/`)
}

function run(state: State): Match[] {
  const index = state.index ?? {}
  const queryTokens = tokenize(state.q)
  const matches: Match[] = []
  for (const entry of Object.values(index)) {
    if (state.tags.some((t) => !entry.tags.includes(t))) continue
    if (state.folders.some((f) => !pageInFolder(entry, f))) continue
    matches.push({ entry, score: score(entry, queryTokens) })
  }
  matches.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.entry.slug < b.entry.slug ? -1 : 1,
  )
  return matches
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function render(state: State): void {
  const root = document.querySelector<HTMLElement>("[data-public-search]")
  if (!root) return

  root.replaceChildren()
  const h1 = document.createElement("h1")
  h1.className = "public-search-title"
  h1.textContent = "搜索"
  root.appendChild(h1)

  const input = document.createElement("input")
  input.className = "public-search-input"
  input.type = "text"
  input.autocomplete = "off"
  input.name = "public-search-q"
  input.placeholder = "输入查询、标签或文件夹进行筛选…"
  input.setAttribute("aria-label", "查询词")
  input.value = state.q
  root.appendChild(input)

  const filters = document.createElement("div")
  filters.className = "public-search-filters"
  filters.setAttribute("aria-label", "标签与文件夹筛选")
  root.appendChild(filters)

  // Folder select (a single folder for the picker; multi-folder AND stays via URL).
  const folderSelect = document.createElement("select")
  folderSelect.className = "public-search-chip"
  const folders = Array.from(
    new Set(
      Object.values(state.index ?? {})
        .map((e) => e.folder)
        .filter((f) => f.length > 0),
    ),
  ).sort()
  const allOption = document.createElement("option")
  allOption.value = ""
  allOption.textContent = "所有文件夹"
  folderSelect.appendChild(allOption)
  const activeFolder = state.folders[0] ?? ""
  for (const folder of folders) {
    const option = document.createElement("option")
    option.value = folder
    option.textContent = folder
    if (folder === activeFolder) option.selected = true
    folderSelect.appendChild(option)
  }
  filters.appendChild(folderSelect)

  // Active filter chips (removable).
  const chipRow = document.createElement("div")
  chipRow.className = "public-search-chips"
  for (const tag of state.tags) {
    chipRow.appendChild(
      makeChip(`#${tag}`, true, () => {
        state.tags = state.tags.filter((t) => t !== tag)
        syncUrl(state)
        render(state)
      }),
    )
  }
  for (const folder of state.folders) {
    chipRow.appendChild(
      makeChip(`📁 ${folder}`, true, () => {
        state.folders = state.folders.filter((f) => f !== folder)
        syncUrl(state)
        render(state)
      }),
    )
  }
  root.appendChild(chipRow)

  // Tag suggestion chips (only when index loaded).
  if (state.allTags.length > 0) {
    const tagRow = document.createElement("div")
    tagRow.className = "public-search-chips"
    tagRow.setAttribute("aria-label", "可用标签")
    for (const tag of state.allTags) {
      const on = state.tags.includes(tag)
      tagRow.appendChild(
        makeChip(`#${tag}`, on, () => {
          if (on) state.tags = state.tags.filter((t) => t !== tag)
          else state.tags = [...state.tags, tag].sort()
          syncUrl(state)
          render(state)
        }),
      )
    }
    root.appendChild(tagRow)
  }

  const status = document.createElement("p")
  status.className = "public-search-status"
  root.appendChild(status)

  const list = document.createElement("div")
  list.className = "public-search-results"
  list.setAttribute("role", "listbox")
  list.setAttribute("aria-live", "polite")
  root.appendChild(list)

  // State resolution
  if (state.loadError) {
    status.textContent = "索引加载失败：请稍后重试或联系站点管理员。"
    return
  }
  if (state.index === null) {
    status.textContent = "正在加载搜索…"
    return
  }

  const hasQuery = state.q.trim().length > 0
  const hasFilter = state.tags.length > 0 || state.folders.length > 0
  if (!hasQuery && !hasFilter) {
    status.textContent = "输入查询词，或点击标签/文件夹进行筛选。"
    return
  }

  const matches = run(state)
  if (matches.length === 0) {
    status.textContent = "无匹配结果。"
    return
  }

  status.textContent = `找到 ${matches.length} 个匹配页面。`
  for (const { entry } of matches) {
    const link = document.createElement("a")
    link.className = "public-search-result"
    link.href = withBase(entry.slug)
    link.setAttribute("role", "option")
    link.setAttribute("aria-selected", "false")

    const h3 = document.createElement("h3")
    h3.textContent = entry.title
    link.appendChild(h3)

    const desc = document.createElement("p")
    desc.textContent = entry.description
    link.appendChild(desc)

    const meta = document.createElement("div")
    meta.className = "public-search-result-meta"
    if (entry.folder) {
      const folderEl = document.createElement("span")
      folderEl.className = "folder"
      folderEl.textContent = entry.folder
      meta.appendChild(folderEl)
    }
    for (const tag of entry.tags) {
      const tagEl = document.createElement("span")
      tagEl.className = "tag"
      tagEl.textContent = `#${tag}`
      meta.appendChild(tagEl)
    }
    link.appendChild(meta)

    list.appendChild(link)
  }

  // Re-render filters state (chips) after index load; input kept in sync below.
  input.addEventListener("input", () => {
    state.q = input.value
    syncUrl(state)
    render(state)
  })
  folderSelect.addEventListener("change", () => {
    const value = folderSelect.value
    state.folders = value ? [value] : []
    syncUrl(state)
    render(state)
  })
}

function makeChip(label: string, on: boolean, onClick: () => void): HTMLElement {
  const chip = document.createElement("button")
  chip.type = "button"
  chip.className = "public-search-chip"
  chip.dataset.on = String(on)
  chip.textContent = label
  chip.addEventListener("click", (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  })
  return chip
}

function syncUrl(state: State): void {
  const params = new URLSearchParams()
  if (state.q) params.set("q", state.q)
  for (const tag of state.tags) if (tag) params.append("tag", tag)
  for (const folder of state.folders) if (folder) params.append("folder", folder)
  const suffix = params.toString()
  const base = getBasePath()
  const target = `${base || "/"}search${suffix ? `?${suffix}` : ""}`
  try {
    window.history.replaceState(null, "", target)
  } catch {
    // Some environments disallow replaceState; results still render locally.
  }
}

async function initSearchPage(): Promise<void> {
  const initial = parseParams()
  const state: State = {
    index: null,
    loadError: false,
    q: initial.q,
    tags: initial.tags,
    folders: initial.folders,
    allTags: [],
  }
  render(state)

  try {
    const response = await fetch(withBase(INDEX_FILE))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const index = (await response.json()) as SearchIndex
    const allTags = Array.from(new Set(Object.values(index).flatMap((e) => e.tags))).sort()
    state.index = index
    state.allTags = allTags
  } catch {
    state.loadError = true
  }
  render(state)
}

function init(): void {
  if (isSearchPage()) {
    void initSearchPage()
    return
  }
  wireEntryInterceptor()
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true })
  } else {
    init()
  }
  // Re-run when the SPA router swaps pages (nav event fires on every nav).
  document.addEventListener("nav", () => {
    if (isSearchPage()) {
      void initSearchPage()
    }
  })
}
