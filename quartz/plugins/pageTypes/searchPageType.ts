import { QuartzPageTypePlugin } from "../types"
import { match } from "./matchers"
import SearchPage from "../../components/pages/SearchPage"

/**
 * Public `/search` route: a real page (not a modal) driven by URL params
 *   /search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>
 *
 * The in-app search modal (@quartz-community/search) is untouched. This page
 * shares the toolbar's search entry: the search button in the header is
 * enhanced by a tiny inline handler (bundled with the page component) so a
 * plain click navigates here, while ⌘/Ctrl+K still opens the existing modal.
 */
export const SearchPageType: QuartzPageTypePlugin = () => ({
  name: "search",
  priority: 50,
  match: match.slugPrefix("search"),
  generate() {
    const title = "搜索"
    const slug = "search" as const
    return [
      {
        slug,
        title,
        data: {
          frontmatter: { title, tags: [] },
        },
      },
    ]
  },
  layout: "content",
  body: SearchPage,
})
