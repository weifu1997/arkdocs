import { FullSlug } from "../../util/path"
import { QuartzPageTypePlugin, PageMatcher } from "../types"
import SearchPageBodyComponent from "../../components/pages/SearchPage"
import { defaultProcessedContent } from "../vfile"

// The /search route is the single virtual page. The match is exact so a user's
// own note named "search.md" (slug "search") is still published, while a note
// named "searched" or a folder "search/" can never be swapped out for the
// search page.
const searchMatcher: PageMatcher = ({ slug }) => slug === "search"

const SearchPageBody = SearchPageBodyComponent()

/**
 * Dedicated public `/search` page. It renders statically and the linked
 * inline script reads the (published-only) ContentIndex and filters by tag
 * and folder via URL parameters:
 *
 *   /search?q=...&tag=...&tag=...&folder=...
 *
 * The page itself is marked unlisted: it is reachable by its URL and emitted
 * as HTML, but never appears in the public ContentIndex, sitemap, RSS or
 * navigation surfaces, mirroring the same treatment for unlisted pages.
 */
export const SearchPageType: QuartzPageTypePlugin = () => {
  return {
    name: "SearchPage",
    priority: 10,
    match: searchMatcher,
    generate() {
      const slug = "search" as FullSlug
      const [, vfile] = defaultProcessedContent({
        slug,
        frontmatter: { title: "搜索", tags: [] },
        unlisted: true,
      })
      return [
        {
          slug,
          title: "搜索",
          data: vfile.data,
        },
      ]
    },
    layout: "search",
    frame: "default",
    body: () => SearchPageBody,
  }
}
