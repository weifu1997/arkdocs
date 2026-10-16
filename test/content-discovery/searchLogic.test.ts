import test, { describe } from "node:test"
import assert from "node:assert/strict"

import {
  normalizeUrlFolder,
  normalizeUrlTag,
  pageHasTag,
  pageInFolder,
  parseSearchParams,
  scoreEntry,
  searchIndex,
  tokenize,
} from "../../quartz/plugins/publicSearch/searchLogic"
import {
  slugifyFilePath,
  slugTag,
  slugHeading,
  normalizeTagValue,
} from "../../quartz/plugins/publicSearch/slug"
import type { PublicSearchIndex, PublicSearchEntry } from "../../quartz/plugins/publicSearch/types"

function entry(overrides: Partial<PublicSearchEntry> = {}): PublicSearchEntry {
  return {
    slug: "z-page",
    title: "标题",
    description: "描述",
    folder: "",
    content: "",
    tags: [],
    filePath: "z-page.md",
    ...overrides,
  }
}

const INDEX: PublicSearchIndex = {
  "features/全文搜索": entry({
    slug: "features/全文搜索",
    title: "全文搜索",
    folder: "features",
    content: "中文连续片段 英文单词 数字 42 连字符 full-text",
    tags: ["component", "搜索"],
    filePath: "features/全文搜索.md",
  }),
  "features/api-v1": entry({
    slug: "features/api-v1",
    title: "API v1",
    folder: "features",
    content: "api-v1 api v2 连字符 1 中英混合",
    tags: ["component", "api", "搜索"],
    filePath: "features/API v1.md",
  }),
  "features/full-text-search": entry({
    slug: "features/full-text-search",
    title: "Full Text Search",
    folder: "features",
    content: "full text search hyphenated words 42",
    tags: ["component", "search"],
    filePath: "features/full-text search.md",
  }),
  "features/nested": entry({
    slug: "features/nested",
    title: "嵌套页面",
    folder: "features",
    content: "位于 features 子目录",
    tags: ["component", "nesting"],
    filePath: "features/子目录/嵌套页面.md",
  }),
  "guides/快速开始": entry({
    slug: "guides/快速开始",
    title: "快速开始",
    folder: "guides",
    content: "guides 目录 入门",
    tags: ["guide", "入门"],
    filePath: "guides/快速开始.md",
  }),
  "guides/sorting-a": entry({
    slug: "guides/sorting-a",
    title: "稳定排序测试",
    folder: "guides",
    content: "稳定排序 tie-breaker 两个页面相关性相同",
    tags: ["sorting"],
    filePath: "guides/稳定排序页面一.md",
  }),
  "guides/sorting-b": entry({
    slug: "guides/sorting-b",
    title: "稳定排序测试",
    folder: "guides",
    content: "稳定排序 tie-breaker 两个页面相关性相同",
    tags: ["sorting"],
    filePath: "guides/稳定排序测试二.md",
  }),
  index: entry({
    slug: "index",
    title: "首页",
    folder: "",
    content: "站点首页",
    tags: ["index"],
    filePath: "index.md",
  }),
}

describe("tokenize (CJK aware)", () => {
  test("tokenizes Chinese character by character", () => {
    assert.deepEqual(tokenize("你好世界"), ["你", "好", "世", "界"])
  })
  test("tokenizes English words", () => {
    assert.deepEqual(tokenize("hello world"), ["hello", "world"])
  })
  test("handles mixed CJK and English", () => {
    assert.deepEqual(tokenize("你好 world"), ["你", "好", "world"])
  })
  test("handles digits and hyphens", () => {
    const tokens = tokenize("api-v1 42")
    assert.ok(tokens.includes("api-v1"))
    assert.ok(tokens.includes("42"))
  })
})

describe("slug helpers match Quartz", () => {
  test("slugifyFilePath normalizes spaces, Chinese, and keeps index", () => {
    assert.equal(slugifyFilePath("features/full-text search.md"), "features/full-text-search")
    assert.equal(slugifyFilePath("index.md"), "index")
    assert.equal(slugifyFilePath("features/index.md"), "features/index")
    assert.equal(slugifyFilePath("features/子目录/嵌套页面.md"), "features/子目录/嵌套页面")
  })
  test("duplicate slug: duplicate.md vs duplicate/index.md", () => {
    // Canonical Quartz emits folder/index.md as "<folder>/index"; the
    // collision detector compares FullSlugs and flags both files.
    assert.equal(slugifyFilePath("duplicate.md"), "duplicate")
    assert.equal(slugifyFilePath("duplicate/index.md"), "duplicate/index")
  })
  test("slugTag normalizes tags and keeps internal spacing -> dash", () => {
    assert.equal(slugTag("Component"), "component")
    // @quartz-community/utils does not trim segment whitespace; " My Note "
    // produces "-my-note-" (spaces -> dashes).
    assert.equal(slugTag(" My Note "), "-my-note-")
    assert.equal(slugTag("搜索/标签"), "搜索/标签")
  })
  test("slugHeading mimics GitHub slugger", () => {
    assert.equal(slugHeading("二级 标题"), "二级-标题")
    assert.equal(slugHeading("Full Text Search"), "full-text-search")
  })
  test("normalizeTagValue handles arrays and whitespace", () => {
    assert.deepEqual(normalizeTagValue([" Component ", "搜索"]), ["component", "搜索"])
  })
})

describe("parseSearchParams", () => {
  test("reads q, repeated tag and folder", () => {
    const sp = new URLSearchParams("q=hello&tag=Component&tag=搜索&folder=features")
    const params = parseSearchParams(sp)
    assert.equal(params.q, "hello")
    assert.deepEqual(params.tags, ["component", "搜索"])
    assert.deepEqual(params.folders, ["features"])
  })
  test("normalizes tag case and surrounding whitespace", () => {
    const sp = new URLSearchParams("tag=  Component  ")
    assert.deepEqual(parseSearchParams(sp).tags, ["component"])
  })
  test("decodes URL-encoded Chinese and spaces", () => {
    const sp = new URLSearchParams("q=%E4%BD%A0%E5%A5%BD&tag=se%20arch")
    const params = parseSearchParams(sp)
    assert.equal(params.q, "你好")
    // tag comparison normalizes surrounding whitespace, not internal spaces
    assert.deepEqual(params.tags, ["se arch"])
  })
  test("handles invalid encoding gracefully", () => {
    const sp = new URLSearchParams("tag=%E0%A4%A&folder=%E0%A4%A")
    const params = parseSearchParams(sp)
    // malformed bytes do not throw; comparisons simply won't match
    assert.ok(params.tags.length === 1)
    assert.ok(params.folders.length === 1)
  })
})

describe("parseSearchParams URL roundtrip", () => {
  test("query built with URLSearchParams round-trips Chinese and spaces", () => {
    const params = new URLSearchParams()
    params.set("q", "中文 搜索")
    params.append("tag", "搜索")
    params.append("tag", "Component")
    params.append("folder", "features")
    const url = new URL(`https://example.com/search?${params.toString()}`)
    const parsed = parseSearchParams(url.searchParams)
    assert.equal(parsed.q, "中文 搜索")
    assert.deepEqual(parsed.tags, ["搜索", "component"])
    assert.deepEqual(parsed.folders, ["features"])
  })
})

describe("filter rules", () => {
  test("folder matches the folder and its children, not siblings", () => {
    assert.equal(pageInFolder(INDEX["features/全文搜索"], "features"), true)
    assert.equal(pageInFolder(INDEX["features/full-text-search"], "features"), true)
    // nested page's folder is "features" (slug-level), matches features folder prefix
    assert.equal(pageInFolder(INDEX["features/nested"], "features"), true)
    assert.equal(pageInFolder(INDEX["guides/快速开始"], "features"), false)
    // root index page has an empty folder and is not inside a non-empty folder
    assert.equal(pageInFolder(INDEX["index"], "features"), false)
  })
  test("tag matching is case/whitespace insensitive", () => {
    const api = INDEX["features/api-v1"]
    assert.equal(pageHasTag(api, normalizeUrlTag("component")), true)
    assert.equal(pageHasTag(api, normalizeUrlTag("  COMPONENT  ")), true)
    assert.equal(pageHasTag(api, normalizeUrlTag("api")), true)
    assert.equal(pageHasTag(api, normalizeUrlTag("nonexistent")), false)
  })
})

describe("scoring and deterministic sort", () => {
  test("empty query + no filters still returns published pages (initial state only)", () => {
    // The search engine itself returns all published pages; the *page* hides
    // them (initial state) when there is no query and no filter. This test
    // asserts the engine's behavior: with no terms, scores are 0 and order is
    // the deterministic slug-ascending tie-break.
    const params = parseSearchParams(new URLSearchParams(""))
    const results = searchIndex(INDEX, params)
    assert.ok(results.length > 0)
    assert.ok(results.every((m) => m.score === 0))
    const slugs = results.map((m) => m.entry.slug)
    assert.deepEqual(slugs, [...slugs].sort())
  })
  test("tag + folder AND", () => {
    // The Chinese tag "搜索" appears on both 全文搜索 and api-v1; combining it
    // with the features folder narrows to both feature pages, never guides.
    const params = parseSearchParams(new URLSearchParams("tag=搜索&folder=features"))
    const slugs = searchIndex(INDEX, params)
      .map((m) => m.entry.slug)
      .sort()
    assert.deepEqual(slugs, ["features/api-v1", "features/全文搜索"].sort())
  })
  test("multiple tags AND", () => {
    // Only api-v1 carries both the component and api tags.
    const params = parseSearchParams(new URLSearchParams("tag=component&tag=api"))
    const slugs = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.deepEqual(slugs, ["features/api-v1"])
  })
  test("tag AND excludes pages without the tag", () => {
    const params = parseSearchParams(new URLSearchParams("tag=api"))
    const slugs = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.deepEqual(slugs, ["features/api-v1"])
  })
  test("same input repeated runs give identical order (stable tie-break)", () => {
    const params = parseSearchParams(new URLSearchParams("tag=sorting"))
    const first = searchIndex(INDEX, params).map((m) => m.entry.slug)
    const second = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.deepEqual(first, second)
    // tie-break is normalized slug ascending: sorting-a before sorting-b
    assert.deepEqual(first, ["guides/sorting-a", "guides/sorting-b"])
  })
  test("no match for unknown tag or folder", () => {
    const params = parseSearchParams(new URLSearchParams("tag=does-not-exist"))
    assert.deepEqual(searchIndex(INDEX, params), [])
    const folderParams = parseSearchParams(new URLSearchParams("folder=does-not-exist"))
    assert.deepEqual(searchIndex(INDEX, folderParams), [])
  })
  test("Chinese substring query matches", () => {
    const params = parseSearchParams(new URLSearchParams("q=中文"))
    const slugs = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.ok(slugs.includes("features/全文搜索"))
  })
  test("mixed CJK+English and hyphenated match", () => {
    // The literal hyphenated term "api-v1" appears only in the api-v1 page.
    const params = parseSearchParams(new URLSearchParams("q=api-v1"))
    const slugs = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.ok(slugs.includes("features/api-v1"))
  })
  test("distinct pages each match their own Chinese term", () => {
    // Only the api-v1 page contains the character "混" (from 中英混合); the
    // 全文搜索 page contains 全文搜索 and the nested page contains 嵌套.
    const params = parseSearchParams(new URLSearchParams("q=混"))
    const slugs = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.deepEqual(slugs, ["features/api-v1"])
  })
  test("Chinese term 全文 searches finds the Chinese page", () => {
    // 全文 is a contiguous substring of 全文搜索.
    const params = parseSearchParams(new URLSearchParams("q=全文"))
    const slugs = searchIndex(INDEX, params).map((m) => m.entry.slug)
    assert.deepEqual(slugs, ["features/全文搜索"])
  })
})
