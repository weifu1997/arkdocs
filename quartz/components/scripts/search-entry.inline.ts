/**
 * Entry-point wiring for the existing search button.
 *
 * Quartz loads search as a layout toolbar component; its popover behavior
 * is unchanged. Readers who prefer a dedicated results page can press the
 * search button (or ctrl/⌘+K) and hit Enter with an empty query, or press
 * ctrl/⌘+Shift+O, and are SPA-navigated to the public `/search` page
 * (relative to the configured baseDir). The component's own shortcuts and
 * popover flow keep working exactly as before.
 */

const ENTRY_SLUG = "search"

function navigateToSearch(): void {
  const basePath = document.body.dataset.basepath ?? ""
  const target = basePath ? `${basePath}/${ENTRY_SLUG}` : `/${ENTRY_SLUG}`
  const router = (window as unknown as { spaNavigate?: (href: string) => Promise<void> })
    .spaNavigate
  if (typeof router === "function") {
    router(target).catch(() => {
      window.location.assign(target)
    })
  } else {
    window.location.assign(target)
  }
}

function installHandler(): void {
  const button = document.querySelector<HTMLButtonElement>(".search .search-button")
  if (!button || button.dataset.searchEntryWired === "true") return
  button.dataset.searchEntryWired = "true"
  button.addEventListener("click", (event) => {
    // Popover behavior stays intact; only a plain click with an empty query
    // is redirected to the dedicated page (ctrl/⌘+K toggles popover).
    const input = document.querySelector<HTMLInputElement>(".search .search-bar")
    if (input && input.value.trim() !== "") return
    event.preventDefault()
    event.stopPropagation()
    navigateToSearch()
  })
}

document.addEventListener("nav", installHandler)
if (document.readyState !== "loading") {
  installHandler()
} else {
  document.addEventListener("DOMContentLoaded", installHandler)
}

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "o" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    navigateToSearch()
  }
})
