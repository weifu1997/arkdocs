import { QuartzPageTypePlugin } from "../types"
import { match } from "./matchers"
import { SearchPage } from "../../components"
import { FullSlug } from "../../util/path"

/**
 * Virtual `/search` page type. No regular content page matches it (`match.none()`);
 * it emits exactly one virtual page at slug `search`, served as `/search.html`
 * with the filter panel rendered by the SearchPage body.
 *
 * The page is always public (never draft/unlisted), and its own searchable
 * content is empty, so it never appears as a result for real queries.
 */
export const SearchPageType: QuartzPageTypePlugin = () => ({
  name: "SearchPageType",
  priority: 10,
  match: match.none(),
  generate({ cfg }) {
    const title = cfg.locale?.startsWith("zh") ? "搜索" : "Search"
    const slug = "search" as FullSlug

    return [
      {
        slug,
        title,
        // Mark the page unlisted so the public content index (and tag/folder
        // listings) skip it, while the dispatcher still emits its HTML.
        data: { title, tags: [], unlisted: true },
      },
    ]
  },
  layout: "search",
  body: SearchPage,
})
