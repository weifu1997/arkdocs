/**
 * `/search` page behavior. The page reads its published entries from the
 * Content Index (`contentIndex.json`, already filtered by draft/unlisted rules
 * at build time) and renders results from URL parameters:
 *
 *   /search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>
 *
 * Refresh or copying the URL restores the exact filter state. Filtering and
 * ranking logic lives in contentDiscovery.ts so the same pure functions are
 * covered by the offline content-discovery tests.
 */
import {
  SearchEntry,
  parseSearchParams,
  buildSearchUrl,
  searchEntries,
  folderFromSlug,
} from "./contentDiscovery"

declare global {
  interface Window {
    fetchData: Promise<Record<string, { title: string; content: string; tags: string[] }>>
  }
}

interface PanelState {
  q: string
  tags: string[]
  folder: string | null
  indexOk: boolean | null // null = loading, true/false = fetch resolved
}

interface SearchPanel {
  input: HTMLInputElement
  tagInput: HTMLInputElement
  tagDatalist: HTMLDataListElement
  folderInput: HTMLInputElement
  tagChips: HTMLElement
  layout: HTMLElement
  results: HTMLElement
  status: HTMLElement
  state: PanelState
}

const entries: SearchEntry[] = []
let allTags: string[] = []
let panel: SearchPanel | null = null
let state: PanelState = { q: "", tags: [], folder: null, indexOk: null }

const i18n = {
  searchBarPlaceholder: "搜索内容",
  initial: "输入查询词，或在下方按标签、文件夹筛选公开页面。",
  noResults: "没有匹配结果。",
  noResultsHint: "请尝试其他查询词，或移除部分标签、文件夹筛选条件。",
  indexLoading: "正在加载内容索引……",
  indexFailed: "内容索引加载失败。请检查构建产物 static/contentIndex.json 是否存在。",
  tagPlaceholder: "按标签筛选，可添加多个（AND）",
  folderPlaceholder: "按文件夹筛选（含子目录）",
  applyFilters: "应用筛选",
  clearAll: "清除全部筛选",
  removeTag: "移除标签",
}

async function loadIndex(): Promise<void> {
  try {
    const data = await window.fetchData
    entries.length = 0
    for (const [slug, item] of Object.entries(data)) {
      entries.push({
        slug,
        title: item.title ?? "",
        description: "",
        tags: Array.isArray(item.tags) ? item.tags : [],
        text: item.content ?? "",
      })
    }
    allTags = [...new Set(entries.flatMap((entry) => entry.tags))].sort((a, b) =>
      a.localeCompare(b),
    )
    state.indexOk = true
  } catch {
    state.indexOk = false
  }
}

function syncUrl(): void {
  const url = buildSearchUrl({ q: state.q, tags: state.tags, folder: state.folder })
  history.pushState({ search: url }, "", url)
}

function applyFiltersFromInputs(): void {
  if (!panel) return
  state.q = panel.input.value.trim()
  state.folder = panel.folderInput.value.trim() || null
}

function renderStatus(): void {
  if (!panel) return
  panel.status.innerHTML = ""
  if (state.indexOk === null) {
    panel.status.textContent = i18n.indexLoading
    panel.status.dataset.kind = "loading"
  } else if (state.indexOk === false) {
    panel.status.textContent = i18n.indexFailed
    panel.status.dataset.kind = "error"
  } else if (!state.q && state.tags.length === 0 && !state.folder) {
    panel.status.textContent = i18n.initial
    panel.status.dataset.kind = "initial"
  } else {
    panel.status.dataset.kind = "results"
  }
}

function renderResults(): void {
  if (!panel) return
  panel.results.innerHTML = ""
  panel.layout.classList.remove("display-results")
  if (state.indexOk !== true) return

  const params = { q: state.q, tags: state.tags, folder: state.folder }
  const matched = searchEntries(entries, params)

  if (!state.q && state.tags.length === 0 && !state.folder) {
    // Initial state: do not render the whole site.
    return
  }

  panel.layout.classList.add("display-results")

  if (matched.length === 0) {
    const card = document.createElement("div")
    card.className = "result-card no-match"
    card.dataset.kind = "no-results"
    const title = document.createElement("h3")
    title.textContent = i18n.noResults
    const hint = document.createElement("p")
    hint.textContent = i18n.noResultsHint
    card.append(title, hint)
    panel.results.appendChild(card)
    return
  }

  for (const entry of matched) {
    const card = document.createElement("a")
    card.className = "result-card"
    // Result links are relative to the current page slug (e.g. features/搜索
    // links to ./guides/安装 via ../guides/安装), which keeps them correct under
    // the baseUrl/baseDir prefix on both the dev server and deployment.
    const simpleSlug = entry.slug.endsWith("/index")
      ? entry.slug.slice(0, -"/index".length)
      : entry.slug
    card.href = `./${simpleSlug}`
    card.id = entry.slug

    const title = document.createElement("h3")
    title.className = "card-title"
    title.textContent = entry.title || entry.slug
    card.appendChild(title)

    const folder = folderFromSlug(entry.slug)
    const path = document.createElement("p")
    path.className = "card-path"
    path.textContent = folder ? `📁 ${folder}` : "📁 /"
    card.appendChild(path)

    if (entry.tags.length > 0) {
      const ul = document.createElement("ul")
      ul.className = "tags"
      for (const tag of entry.tags) {
        const li = document.createElement("li")
        const chip = document.createElement("p")
        chip.textContent = `#${tag}`
        li.appendChild(chip)
        ul.appendChild(li)
      }
      card.appendChild(ul)
    }

    const description = document.createElement("p")
    description.className = "card-description"
    // The published Content Index carries title/tags/searchable text but no
    // separate description; show a fixed fallback when the searchable text is
    // empty (or only whitespace).
    description.textContent = entry.description || entry.text || "暂无摘要"
    card.appendChild(description)

    panel.results.appendChild(card)
  }
}

function renderChips(): void {
  if (!panel) return
  panel.tagChips.innerHTML = ""
  for (const tag of state.tags) {
    const chip = document.createElement("span")
    chip.className = "search-filter-chip"
    const label = document.createElement("span")
    label.textContent = `#${tag}`
    const remove = document.createElement("button")
    remove.type = "button"
    remove.className = "search-filter-remove"
    remove.setAttribute("aria-label", `${i18n.removeTag} ${tag}`)
    remove.textContent = "×"
    remove.addEventListener("click", () => {
      state.tags = state.tags.filter((item) => item !== tag)
      syncUrl()
      renderChips()
      renderResults()
    })
    chip.append(label, remove)
    panel.tagChips.appendChild(chip)
  }
}

function renderAll(): void {
  renderStatus()
  renderChips()
  renderResults()
}

function onInputChange(): void {
  applyFiltersFromInputs()
  renderResults()
}

function onEnterFilter(): void {
  applyFiltersFromInputs()
  state.q = panel?.input.value.trim() ?? ""
  syncUrl()
  renderAll()
}

function addTag(): void {
  const value = panel?.tagInput.value.trim().replace(/^#/, "")
  if (!value) return
  const normalized = value.toLowerCase()
  if (!state.tags.includes(normalized)) state.tags.push(normalized)
  if (panel) panel.tagInput.value = ""
  syncUrl()
  renderAll()
}

function clearAllFilters(): void {
  state.tags = []
  state.folder = null
  if (panel) {
    panel.input.value = ""
    panel.folderInput.value = ""
    panel.tagInput.value = ""
  }
  syncUrl()
  renderAll()
}

function setupPanel(): void {
  const container = document.querySelector<HTMLDivElement>(".search > .search-container")
  if (!container) return
  // Idempotence: remove a previous in-page render before wiring new listeners.
  container.innerHTML = ""
  container.classList.add("active")

  const space = document.createElement("div")
  space.className = "search-space"

  const input = document.createElement("input")
  input.className = "search-bar"
  input.name = "search"
  input.type = "text"
  input.autocomplete = "off"
  input.placeholder = i18n.searchBarPlaceholder
  input.setAttribute("aria-label", i18n.searchBarPlaceholder)
  input.value = state.q
  space.appendChild(input)

  const filters = document.createElement("div")
  filters.className = "search-filters"

  const tagWrap = document.createElement("div")
  tagWrap.className = "search-filter-field"
  const tagInput = document.createElement("input")
  tagInput.className = "search-bar search-tag-input"
  tagInput.name = "search-tag"
  tagInput.type = "text"
  tagInput.autocomplete = "off"
  tagInput.placeholder = i18n.tagPlaceholder
  tagInput.setAttribute("aria-label", i18n.tagPlaceholder)
  const tagDatalist = document.createElement("datalist")
  tagDatalist.id = "search-tag-options"
  for (const tag of allTags) {
    const option = document.createElement("option")
    option.value = tag
    tagDatalist.appendChild(option)
  }
  tagInput.setAttribute("list", "search-tag-options")
  const tagChips = document.createElement("div")
  tagChips.className = "search-filter-chips"
  tagWrap.append(tagInput, tagChips)
  filters.appendChild(tagWrap)

  const folderWrap = document.createElement("div")
  folderWrap.className = "search-filter-field"
  const folderInput = document.createElement("input")
  folderInput.className = "search-bar search-folder-input"
  folderInput.name = "search-folder"
  folderInput.type = "text"
  folderInput.autocomplete = "off"
  folderInput.placeholder = i18n.folderPlaceholder
  folderInput.value = state.folder ?? ""
  folderWrap.appendChild(folderInput)
  filters.appendChild(folderWrap)

  const actions = document.createElement("div")
  actions.className = "search-filter-actions"
  const apply = document.createElement("button")
  apply.type = "button"
  apply.className = "search-button search-apply"
  apply.textContent = i18n.applyFilters
  const clear = document.createElement("button")
  clear.type = "button"
  clear.className = "search-button search-clear"
  clear.textContent = i18n.clearAll
  actions.append(apply, clear)
  filters.appendChild(actions)
  space.appendChild(filters)

  const layout = document.createElement("div")
  layout.className = "search-layout"
  layout.dataset.fieldPriority = '["title", "content", "tags"]'

  const results = document.createElement("div")
  results.className = "results-container"
  results.setAttribute("role", "listbox")
  results.setAttribute("aria-label", i18n.searchBarPlaceholder)
  layout.appendChild(results)
  space.appendChild(layout)

  const status = document.createElement("p")
  status.className = "search-status"
  space.appendChild(status)

  container.appendChild(space)

  panel = {
    input,
    tagInput,
    tagDatalist,
    folderInput,
    tagChips,
    layout,
    results,
    status,
    state,
  }

  input.addEventListener("input", onInputChange)
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault()
      onEnterFilter()
    }
  })
  folderInput.addEventListener("input", onInputChange)
  folderInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault()
      onEnterFilter()
    }
  })
  tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault()
      addTag()
    }
  })
  apply.addEventListener("click", onEnterFilter)
  clear.addEventListener("click", clearAllFilters)

  const cleanup = () => {
    panel = null
    container.classList.remove("active")
  }
  if (typeof window.addCleanup === "function") window.addCleanup(cleanup)
}

async function init(): Promise<void> {
  const previous = state
  state = { q: "", tags: [], folder: null, indexOk: previous.indexOk }

  const params = parseSearchParams(window.location.search)
  state.q = params.q
  state.tags = params.tags
  state.folder = params.folder

  setupPanel()
  if (panel) {
    panel.input.value = state.q
    panel.folderInput.value = state.folder ?? ""
  }

  if (state.indexOk === null) {
    await loadIndex()
  } else if (state.indexOk === true && entries.length === 0) {
    await loadIndex()
  }
  renderAll()
}

// Top-level DOM wiring. Guarded so the module is importable in non-DOM
// environments (offline tests) without throwing; in a real browser `document`
// is always present.
if (typeof document !== "undefined") {
  document.addEventListener("content-index-updated", (event) => {
    const detail = (event as CustomEvent<{ slugs?: unknown[] }>).detail
    if (!detail?.slugs || !Array.isArray(detail.slugs)) return
    loadIndex().then(() => {
      if (panel) renderAll()
    })
  })

  document.addEventListener("nav", () => {
    init()
  })
  document.addEventListener("render", () => {
    init()
  })

  init()
}
