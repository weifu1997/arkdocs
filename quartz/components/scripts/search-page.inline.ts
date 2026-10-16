/**
 * Client runtime for the public /search page.
 *
 * Runs after the DOM is ready and on every SPA navigation (the existing
 * search plugin's afterDOMLoaded hook already performs this pattern). It:
 *   1. reads the canonical filters from the current URL (refresh / copy-URL
 *      safety via URLSearchParams encoding);
 *   2. fetches the existing Content Index (the same static/contentIndex.json
 *      data the header injects through the shared `fetchData` promise; also
 *      fetched directly so an inline `fetchData` failure cannot blank the page);
 *   3. renders initial / results / no-results / error states;
 *   4. keeps the URL in sync as the reader edits the query, tags, or folder;
 *      invalid parameter combinations never throw.
 */

import {
  SearchIndex,
  SearchFilters,
  RankedResult,
  parseSearchQuery,
  toSearchURL,
  normalizeFolder,
  normalizeTag,
  searchIndex,
  FALLBACK_DESCRIPTION,
} from "./search-adapter"

declare global {
  interface Window {
    fetchData?: () => Promise<unknown>
  }
}

function elementOf<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector)
}

interface HiddenElement extends Element {
  hidden: boolean
}

/** Load the public Content Index, tolerating network errors. */
async function loadIndex(basePath: string): Promise<SearchIndex | null> {
  const url = basePath ? `${basePath}/static/contentIndex.json` : "/static/contentIndex.json"
  try {
    const own = fetch(url)
    const injected = typeof window.fetchData === "function" ? window.fetchData() : null
    const [response, shared] = await Promise.all([own, injected])
    if (shared && typeof shared === "object") return shared as SearchIndex
    if (!response.ok) return null
    return (await response.json()) as SearchIndex
  } catch {
    return null
  }
}

function updateState(root: Element, state: string): void {
  root.setAttribute("data-state", state)
  const status = elementOf(".search-page-status") as HiddenElement | null
  if (status) status.hidden = state === "ready"
  const list = elementOf(".search-page-results") as HiddenElement | null
  if (list) list.hidden = state === "idle" || state === "loading" || state === "ready"
}

function resultItem(entry: RankedResult): HTMLLIElement {
  const li = document.createElement("li")
  li.className = "search-page-result"

  const link = document.createElement("a")
  link.className = "search-page-result-link"
  link.href = entry.slug
  link.textContent = entry.title

  const meta = document.createElement("div")
  meta.className = "search-page-result-meta"
  const folder = entry.folder || "（根目录）"
  const tags = entry.tags.length > 0 ? `标签：${entry.tags.join(", ")}` : ""
  meta.textContent = [folder, tags].filter(Boolean).join("　")
  link.appendChild(meta)

  const description = document.createElement("p")
  description.className = "search-page-result-description"
  description.textContent = entry.description || FALLBACK_DESCRIPTION

  li.appendChild(link)
  li.appendChild(description)
  return li
}

function renderItems(items: RankedResult[], list: HiddenElement | null): void {
  if (!list) return
  list.replaceChildren()
  for (const item of items) list.appendChild(resultItem(item))
}

function renderResults(items: RankedResult[]): void {
  const list = elementOf<HTMLElement>(".search-page-results") as HiddenElement | null
  renderItems(items, list)
  const count = elementOf(".search-page-status") as HiddenElement | null
  if (count) count.textContent = `找到 ${items.length} 个匹配页面`
}

function statusText(key: "empty" | "error"): string {
  return key === "error" ? "搜索索引加载失败，请稍后重试。" : "没有匹配结果。"
}

function applyFilters(filters: SearchFilters): void {
  const queryInput = elementOf<HTMLInputElement>(".search-page-query")
  if (queryInput && queryInput.value !== filters.query) {
    queryInput.value = filters.query
  }
  const tagInput = elementOf<HTMLInputElement>(".search-page-tags")
  if (tagInput && tagInput.value !== filters.tags.join(" ")) {
    tagInput.value = filters.tags.join(" ")
  }
  const folderInput = elementOf<HTMLInputElement>(".search-page-folder")
  if (folderInput && folderInput.value !== filters.folder) {
    folderInput.value = filters.folder
  }
}

async function bootstrap(): Promise<void> {
  const root = elementOf<HTMLElement>(".search-page")
  if (!root) return

  const basePath = document.body.dataset.basepath ?? ""
  let filters = parseSearchQuery(window.location.search)
  let index: SearchIndex | null = null

  const syncURL = (): void => {
    const target = toSearchURL(filters)
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState({}, "", target)
    }
  }

  const render = async (): Promise<void> => {
    applyFilters(filters)
    syncURL()
    const isInitial = !filters.query && filters.tags.length === 0 && filters.folder === ""
    if (isInitial) {
      updateState(root, "idle")
      renderItems([], elementOf<HTMLElement>(".search-page-results") as HiddenElement | null)
      const status = elementOf(".search-page-status") as HiddenElement | null
      if (status) status.textContent = "输入查询词、标签或文件夹以筛选公开页面。"
      return
    }

    updateState(root, "loading")
    const status = elementOf(".search-page-status")
    if (status) status.textContent = "正在搜索…"
    if (!index) {
      index = await loadIndex(basePath)
    }
    const items = searchIndex(index, filters)
    if (items.length === 0) {
      const failed = index === null
      updateState(root, failed ? "error" : "empty")
      if (status) status.textContent = statusText(failed ? "error" : "empty")
      renderItems([], elementOf<HTMLElement>(".search-page-results") as HiddenElement | null)
      return
    }
    renderResults(items)
    updateState(root, "ready")
  }

  const onInput = (): void => {
    const queryInput = elementOf<HTMLInputElement>(".search-page-query")
    const tagInput = elementOf<HTMLInputElement>(".search-page-tags")
    const folderInput = elementOf<HTMLInputElement>(".search-page-folder")
    const query = normalizeTag(queryInput?.value ?? "")
    const tags = (tagInput?.value ?? "")
      .split(/[\s,]+/)
      .map((tag) => normalizeTag(tag))
      .filter(Boolean)
    const folder = normalizeFolder(folderInput?.value ?? "")
    filters = { query, tags, folder }
    void render()
  }

  const reset = (): void => {
    filters = { query: "", tags: [], folder: "" }
    void render()
  }

  const queryInput = elementOf<HTMLInputElement>(".search-page-query")
  const tagInput = elementOf<HTMLInputElement>(".search-page-tags")
  const folderInput = elementOf<HTMLInputElement>(".search-page-folder")
  const resetButton = elementOf<HTMLButtonElement>(".search-page-reset")

  for (const input of [queryInput, tagInput, folderInput]) {
    input?.addEventListener("input", onInput)
  }
  resetButton?.addEventListener("click", reset)

  void render()
}

export default bootstrap

if (typeof document !== "undefined") {
  const run = (): void => {
    void bootstrap()
  }
  document.addEventListener("nav", run)
  if (document.readyState !== "loading") {
    run()
  } else {
    document.addEventListener("DOMContentLoaded", run)
  }
}
