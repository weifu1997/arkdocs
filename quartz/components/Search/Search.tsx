import { QuartzComponent, QuartzComponentConstructor } from "../types"
import searchStyle from "./search.scss"

/**
 * The public search entry point. Clicking this button navigates to the `/search`
 * route (a real URL), where queries, tag filters and folder filters are kept
 * in URL parameters so the exact filter state survives refresh, copying or
 * SPA navigation.
 *
 * The button reuses the existing `.search` shell so keyboard shortcuts
 * (Ctrl/Cmd+K) and mobile layout behavior stay unchanged.
 */

export default (() => {
  const Search: QuartzComponent = ({ cfg }) => {
    const locale = cfg.locale ?? "en-US"
    const searchLabel = locale.startsWith("zh") ? "搜索" : "Search"

    const openSearchPage = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      // Respect the configured base path (e.g. /arkdocs) so the logical
      // /search route resolves correctly under both the dev server (basepath
      // is "/") and a subpath deployment.
      const basePath = document.body?.dataset?.basepath ?? ""
      const searchPath = `${basePath}/search`
      window.spaNavigate?.(new URL(searchPath, window.location.href))
      document.dispatchEvent(new CustomEvent("search-entry-nav", { detail: { url: searchPath } }))
    }

    return (
      <div className="search">
        <button
          className="search-button"
          type="button"
          aria-label={searchLabel}
          aria-expanded="false"
          onClick={openSearchPage}
        >
          <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7">
            <title>Search</title>
            <g className="search-path" fill="none">
              <path d="M18.5 18.3l-5.4-5.4" />
              <circle cx="8" cy="8" r="7" />
            </g>
          </svg>
          <p>{searchLabel}</p>
        </button>
        <div className="search-container" />
      </div>
    )
  }

  Search.css = searchStyle
  return Search
}) satisfies QuartzComponentConstructor
