import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
// @ts-ignore
import searchScript from "../../search/search.inline"
import searchStyle from "../Search/search.scss"

/**
 * Body of the public `/search` route. It renders the `.search > .search-container`
 * shell that quartz/search/search.inline.ts mounts the filter panel into. The
 * inline script is bundled as text (the build's inline-script-loader transpiles
 * and bundles it, including its contentDiscovery.ts import) and loaded after the
 * DOM is ready.
 *
 * Filter state lives in URL parameters (`/search?q=...&tag=...&folder=...`),
 * so refresh, copying the URL or SPA navigation restores the exact view.
 */
const SearchPage: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const title = i18n(cfg.locale).components.search.title

  return (
    <article className="search-page">
      <h1>{title}</h1>
      <div className="search">
        <div className="search-container" />
      </div>
    </article>
  )
}

SearchPage.afterDOMLoaded = searchScript
SearchPage.css = searchStyle

export default (() => SearchPage) satisfies QuartzComponentConstructor
