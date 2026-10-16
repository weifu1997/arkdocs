import test, { describe } from "node:test"
import assert from "node:assert"
import { render } from "preact-render-to-string"
import { SearchPage } from "../../quartz/components"
import { SearchPageType } from "../../quartz/plugins/pageTypes/search"
import { FullSlug } from "../../quartz/util/path"
import type { QuartzPluginData } from "../../quartz/plugins/vfile"

/** Minimal cfg shaped like GlobalConfiguration for rendering the body. */
const cfg = { locale: "zh-CN", baseUrl: "example.com" } as never

function renderSearchBody(): string {
  const componentData = { cfg, ctx: { argv: {} } } as never
  // The export is a QuartzComponentConstructor; invoke it to get the component.
  const Component = SearchPage() as unknown as (
    props: typeof componentData,
  ) => import("preact").JSX.Element
  return render(Component(componentData))
}

describe("/search route: page type and page body", () => {
  test("the page type emits exactly one virtual page at slug 'search'", () => {
    const pageType = SearchPageType()
    assert.strictEqual(pageType.name, "SearchPageType")
    assert.strictEqual(pageType.match({ slug: "search", fileData: {}, cfg }), false)

    const virtualPages = pageType.generate!({ content: [], cfg, ctx: {} } as never)
    assert.strictEqual(virtualPages.length, 1)
    assert.strictEqual(virtualPages[0].slug, "search" as FullSlug)
  })

  test("the emitted virtual page excludes itself from the public index", () => {
    const pageType = SearchPageType()
    const [vp] = pageType.generate!({ content: [], cfg, ctx: {} } as never)
    const data = vp.data as Partial<QuartzPluginData>
    assert.strictEqual(data.unlisted, true)
  })

  test("the rendered body contains the mount point the inline script wires up", () => {
    const html = renderSearchBody()
    assert.match(html, /class="search-page"/)
    assert.match(html, /class="search-container"/)
    // The inline script must be attached to the component so it loads after the
    // DOM. (In this offline environment the script is stubbed to a string; the
    // end-to-end attachment is verified by the real build.)
    const Component = SearchPage() as unknown as Record<string, unknown>
    assert.strictEqual(typeof Component.afterDOMLoaded, "string")
  })

  test("the title renders in the configured locale", () => {
    const html = renderSearchBody()
    assert.match(html, /<h1[^>]*>搜索<\/h1>/)
  })
})
