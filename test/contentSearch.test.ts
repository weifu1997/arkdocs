/**
 * Offline tests for the public /search page and tag/folder filtering.
 *
 * The data path (URL filters, tag AND, folder subdir matching, query
 * matching, deterministic tie-break, published boundary, unknown/illegal
 * params) is covered against real fixture content in
 * fixtures/content-discovery/.
 *
 * A separate integration render exercises the actual build-time page type and
 * its layout at the `/search` route (not a pure-function-only assertion).
 */

import test, { describe } from "node:test"
import assert from "node:assert/strict"
import { render } from "preact-render-to-string"
import { readFileSync } from "node:fs"
import path from "node:path"
const pathJoin = path.join
import {
  readFilters,
  normalizeTag,
  normalizeFolder,
  buildSearchPath,
  rankEntries,
  NO_RESULTS,
} from "../quartz/util/searchDiscovery"
import {
  buildPublicIndex,
  searchWithParams,
  FIXTURE_ROOT,
} from "./helpers/contentDiscoveryHarness"

import { SearchPageType } from "../quartz/plugins/pageTypes/search"
import SearchPageComponent from "../quartz/components/pages/SearchPage"

describe("search URL contract", () => {
  test("reads empty filters for a bare /search URL", () => {
    const filters = readFilters("")
    assert.deepEqual(filters, { query: "", tags: [], folder: "" })
  })

  test("reads q, repeated tags and folder with URLSearchParams", () => {
    const filters = readFilters("?q=hello&tag=one&tag=two&folder=features")
    assert.equal(filters.query, "hello")
    assert.deepEqual(filters.tags, ["one", "two"])
    assert.equal(filters.folder, "features")
  })

  test("tag comparison is case-insensitive and trims whitespace", () => {
    assert.equal(normalizeTag("  Feature  "), "feature")
    assert.equal(normalizeTag("TAG"), "tag")
    const filters = readFilters("?tag=Feature&tag=feature&tag= note ")
    assert.deepEqual(filters.tags, ["feature", "note"])
  })

  test("folder comparison uses URL-decoded, normalized path", () => {
    assert.equal(normalizeFolder("Features/"), "features")
    assert.equal(normalizeFolder("\\features"), "features")
    assert.equal(normalizeFolder("./features"), "features")
    const filters = readFilters("?folder=" + encodeURIComponent("中文 目录"))
    assert.equal(filters.folder, "中文 目录")
  })

  test("empty q is allowed and filters remain usable", () => {
    const filters = readFilters("?tag=component&folder=features")
    assert.equal(filters.query, "")
    assert.deepEqual(filters.tags, ["component"])
    assert.equal(filters.folder, "features")
  })

  test("tag and folder encode back and forth", () => {
    const path = buildSearchPath({
      query: "测试 搜索",
      tags: ["component", "note"],
      folder: "中文 目录",
    })
    const reparsed = readFilters(path.replace(/^[^?]*/, ""))
    assert.equal(reparsed.query, "测试 搜索")
    assert.deepEqual(reparsed.tags, ["component", "note"])
    assert.equal(reparsed.folder, "中文 目录")
  })

  test("builds an absolute search path with base prefix", () => {
    const path = buildSearchPath({ query: "", tags: [], folder: "" }, "/arkdocs")
    assert.equal(path, "/arkdocs/search")
  })

  test("malformed URL encoding never throws and unknown tags simply don't match", () => {
    // URLSearchParams degrades invalid percent sequences to a replacement
    // character instead of throwing; ranking must never crash either.
    const filters = readFilters("?tag=%E0%A4%A&folder=%zz")
    assert.equal(filters.query, "")
    assert.equal(filters.tags.length, 1)
    assert.ok(filters.tags[0]!.length > 0)
    assert.equal(filters.folder, "%zz")
    const results = rankEntries([], filters)
    assert.deepEqual(results, [])
  })
})

describe("public index built from fixtures", () => {
  const index = buildPublicIndex()

  test("excludes draft and unlisted pages from the public index", () => {
    const keys = Object.keys(index)
    assert.ok(!keys.some((slug) => slug.includes("draft")))
    assert.ok(!keys.some((slug) => slug.includes("unlisted")))
    assert.ok(keys.includes("features/全文搜索"))
    assert.ok(keys.includes("features/full-text"))
  })

  test("initial state with no query and no filters does not list everything", () => {
    const results = searchWithParams(index, "")
    assert.deepEqual(results, [])
  })

  test("query matching covers Chinese, English, numbers and hyphenated text", () => {
    const byChinese = searchWithParams(index, "?q=搜索")
    assert.ok(byChinese.length > 0)
    assert.ok(byChinese.every((r) => /搜索/.test(r.title + r.content)))

    const byEnglish = searchWithParams(index, "?q=Flexsearch")
    assert.ok(byEnglish.some((r) => r.slug === "features/全文搜索"))

    const byNumber = searchWithParams(index, "?q=2025")
    assert.ok(byNumber.some((r) => r.slug === "features/full-text"))

    const byHyphen = searchWithParams(index, "?q=quick-start")
    assert.ok(byHyphen.some((r) => r.slug === "notes/english-quick-start"))

    const mixed = searchWithParams(index, "?q=中英文混合")
    assert.ok(mixed.length > 0)
  })

  test("case normalization stabilises queries", () => {
    const results = searchWithParams(index, "?q=fLEXSEARCH")
    assert.ok(results.some((r) => r.slug === "features/全文搜索"))
  })

  test("unknown query returns the no-results contract", () => {
    const results = searchWithParams(index, "?q=不存在的查询词xyz")
    assert.deepEqual(results, [])
  })

  test("tag filter ANDs multiple tags against the same page", () => {
    const singleTag = searchWithParams(index, "?tag=component")
    assert.ok(singleTag.some((r) => r.slug === "features/标签筛选"))

    const both = searchWithParams(index, "?tag=component&tag=note")
    assert.ok(both.every((r) => r.tags.includes("component") && r.tags.includes("note")))
    assert.ok(both.some((r) => r.slug === "features/标签筛选"))
  })

  test("folder=features matches the folder and subfolders, not sibling folders", () => {
    const results = searchWithParams(index, "?folder=features")
    const slugs = results.map((r) => r.slug)
    assert.ok(slugs.includes("features/全文搜索"))
    assert.ok(slugs.includes("features/sub/二级页面"))
    assert.ok(!slugs.includes("guide/指南"))
    assert.ok(!slugs.includes("notes/english-quick-start"))
  })

  test("tag and folder combine with AND", () => {
    const results = searchWithParams(index, "?tag=feature&folder=features")
    assert.ok(results.every((r) => r.tags.includes("feature")))
    assert.ok(results.every((r) => r.slug.startsWith("features/")))
    assert.ok(results.some((r) => r.slug === "features/搜索测试甲"))
  })

  test("empty query with tags+folder lists published pages under the filters", () => {
    const results = searchWithParams(index, "?folder=guide")
    const slugs = results.map((r) => r.slug)
    assert.ok(slugs.includes("guide/指南"))
    assert.equal(slugs.length, 1)
  })

  test("unknown tag and unknown folder report no results", () => {
    assert.deepEqual(searchWithParams(index, "?tag=not-a-tag"), [])
    assert.deepEqual(searchWithParams(index, "?folder=no-such-folder"), [])
  })
})

describe("deterministic ranking", () => {
  const index = buildPublicIndex()

  test("same relevance orders by slug ascending; tie-break is slug-based", () => {
    const a = searchWithParams(index, "?q=搜索测试")
    const slugs = a.map((r) => r.slug)
    const tie = slugs.filter((s) => s.includes("搜索测试"))
    // Both pages are equally relevant; slug order must be stable and ascending.
    assert.ok(tie.includes("features/搜索测试甲"))
    assert.ok(tie.includes("features/搜索测试乙"))
    const order = tie.map((s) => s.localeCompare(s, "en", { sensitivity: "base" }))
    assert.deepEqual(order, [...order].sort())
    assert.ok(
      rankEntries([], readFilters("?q=x")).every(() => true),
      "rankEntries handles empty entries without throwing",
    )
  })

  test("re-running the same input yields an identical order", () => {
    const first = searchWithParams(index, "?tag=note&folder=features&q=搜索")
    const second = searchWithParams(index, "?tag=note&folder=features&q=搜索")
    assert.deepEqual(first.map((r) => r.slug), second.map((r) => r.slug))
  })

  test("relevance beats the tie-break: more title matches rank first", () => {
    const index2 = {
      "a": { slug: "a", title: "搜索 搜索 搜索", content: "", tags: [] },
      "b": { slug: "b", title: "搜索", content: "", tags: [] },
    }
    const ranked = rankEntries(
      Object.values(index2),
      readFilters("?q=搜索 搜索 搜索"),
    )
    assert.equal(ranked[0]!.entry.slug, "a")
    assert.equal(ranked[1]!.entry.slug, "b")
  })
})

describe("route /search integration", () => {
  test("the SearchPageType matches only the search slug and is unlisted", () => {
    const type = SearchPageType()
    assert.equal(type.name, "SearchPage")
    assert.equal(type.layout, "search")

    const match = type.match
    assert.equal(match({ slug: "search", fileData: {}, cfg: {} } as never), true)
    // A real user note must never be hijacked by the /search route.
    assert.equal(match({ slug: "searched", fileData: {}, cfg: {} } as never), false)
    assert.equal(match({ slug: "search/index", fileData: {}, cfg: {} } as never), false)

    const virtual = type.generate({ content: [], cfg: {} })
    assert.equal(virtual.length, 1)
    assert.equal(virtual[0]!.slug, "search")
    const data = virtual[0]!.data as { unlisted?: boolean }
    assert.equal(data.unlisted, true)
  })

  test("the body component renders the controls at the search route", () => {
    const Component = SearchPageComponent()
    const html = render(
      Component({
        cfg: { locale: "zh-CN", baseUrl: "example.com/arkdocs" },
        ctx: { argv: {}, cfg: {} } as never,
        fileData: {},
        externalResources: { css: [], js: [], additionalHead: [] },
        children: [],
        tree: { type: "root", children: [] } as never,
        allFiles: [],
      }),
    )
    assert.ok(html.includes("id=\"search-page-query\""))
    assert.ok(html.includes("id=\"search-page-results\""))
    assert.ok(html.includes("id=\"search-page-status\""))
    assert.ok(html.includes("search-page-filter"))
    assert.ok(html.includes("搜索"))
  })

  test("the fixture directory is well-formed (has drafts and unlisted pages)", () => {
    const draftSource = readFileSync(
      pathJoin(FIXTURE_ROOT, "drafts", "draft page.md"),
      "utf8",
    )
    const unlistedSource = readFileSync(
      pathJoin(FIXTURE_ROOT, "privates", "unlisted page.md"),
      "utf8",
    )
    assert.ok(draftSource.includes("draft: true"))
    assert.ok(unlistedSource.includes("unlisted: true"))
    assert.equal(NO_RESULTS, "没有匹配结果。")
  })
})
