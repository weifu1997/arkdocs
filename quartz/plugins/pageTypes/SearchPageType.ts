import { QuartzPageTypePlugin } from "../types"
import SearchPage from "../../components/SearchPage"
import { i18n } from "../../i18n"
import { FullSlug } from "../../util/path"
import { defaultProcessedContent } from "../vfile"
import { VirtualPage } from "../types"

/**
 * Builtin `/search` page type.
 *
 * The page is a static shell; the browser fills it from the public Content
 * Index. No Frontmatter is read from disk for this slug (there is no
 * `content/search.md`), so the page itself is always reachable and never
 * leaks draft / unlisted / ignored pages — those pages never enter the
 * public index.
 */
export const SearchPageType: QuartzPageTypePlugin = (opts?: { title?: string }) => ({
  name: "SearchPage",
  priority: 20,
  match: ({ slug }) => slug === "search",
  layout: "search",
  generate({ cfg }) {
    const locale = cfg?.locale ?? "en-US"
    const title = opts?.title ?? i18n(locale).components?.search?.title ?? "搜索"
    const slug = "search" as FullSlug
    const [, vfile] = defaultProcessedContent({
      slug,
      text: title,
      description: title,
      frontmatter: { title, tags: [] },
    })
    const page: VirtualPage = {
      slug,
      title,
      data: vfile.data,
    }
    return [page]
  },
  body: SearchPage,
})
