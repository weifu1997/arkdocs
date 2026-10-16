import test, { describe } from "node:test"
import assert from "node:assert"
import {
  parseSearchQuery,
  toSearchURL,
  normalizeFolder,
  normalizeTag,
  normalizeText,
  pageFolder,
  rankEntries,
  matchesFilters,
  searchIndex,
  FALLBACK_DESCRIPTION,
  SearchIndex,
  SearchIndexEntry,
} from "./search-adapter"
import { buildFixtureIndex } from "../../content-discovery/build-fixture-index.mjs"

// Keep the fixture index in-process so every assertion shares the same
// published boundary (draft / unlisted / private excluded).
const fixtureIndex = buildFixtureIndex()
const INDEX: SearchIndex = Object.fromEntries(
  Object.entries(fixtureIndex).map(([slug, entry]) => [slug, { ...entry, tags: entry.tags }]),
)

function entry(slug: string, overrides: Partial<SearchIndexEntry> = {}): SearchIndexEntry {
  return { slug, title: slug, tags: [], content: "", ...overrides }
}

describe("search adapter: URL parsing", () => {
  test("parses q, repeated tag, and folder", () => {
    const filters = parseSearchQuery("q=测试&tag=Component&tag=guide&folder=features")
    assert.strictEqual(filters.query, "测试")
    assert.deepStrictEqual(filters.tags, ["component", "guide"])
    assert.strictEqual(filters.folder, "features")
  })

  test("tag comparison ignores case and surrounding whitespace", () => {
    const filters = parseSearchQuery("tag=%20Component%20&tag=GUIDE")
    assert.deepStrictEqual(filters.tags, ["component", "guide"])
  })

  test("folder accepts URL-encoded Chinese and space paths", () => {
    assert.strictEqual(normalizeFolder("features/folder%20and%20tag"), "features/folder-and-tag")
    assert.strictEqual(normalizeFolder("深层目录"), "深层目录")
  })

  test("folder treats index segment as equivalent to its parent", () => {
    assert.strictEqual(normalizeFolder("features/index"), "features")
    assert.strictEqual(normalizeFolder("features/"), "features")
  })

  test("invalid percent-encoding never throws", () => {
    // URLSearchParams substitutes replacement characters for the incomplete
    // multibyte sequence; everything else decodes verbatim.
    const filters = parseSearchQuery("q=%E0%A4%A&tag=broken%&folder=%")
    assert.strictEqual(filters.query.length >= 0, true)
    assert.deepStrictEqual(filters.tags, ["broken%"])
    assert.strictEqual(filters.folder, "%")
  })

  test("missing parameters yield empty filters", () => {
    const filters = parseSearchQuery("")
    assert.deepStrictEqual(filters, { query: "", tags: [], folder: "" })
  })

  test("a full URL parses the same way as a bare query string", () => {
    const fromURL = parseSearchQuery(
      "https://example.com/arkdocs/search?q=graph&tag=component&folder=features",
    )
    const fromString = parseSearchQuery("?q=graph&tag=component&folder=features")
    assert.deepStrictEqual(fromURL, fromString)
  })
})

describe("search adapter: URL round-trip", () => {
  test("toSearchURL + parseSearchQuery are exact for Chinese and spaces", () => {
    const url = toSearchURL({
      query: "中英混合 Mixed",
      tags: ["组件"],
      folder: "features/sub",
    })
    const filters = parseSearchQuery(url)
    assert.strictEqual(filters.query, "中英混合 mixed")
    assert.deepStrictEqual(filters.tags, ["组件"])
    assert.strictEqual(filters.folder, "features/sub")
  })

  test("whitespace-padded tag variants round-trip to a single normalized tag", () => {
    const url = toSearchURL({
      query: "",
      tags: [" Component ", "组件"],
      folder: "",
    })
    const filters = parseSearchQuery(url)
    assert.deepStrictEqual(filters.tags, ["component", "组件"])
  })

  test("empty filters produce the bare /search path", () => {
    assert.strictEqual(toSearchURL({ query: "", tags: [], folder: "" }), "/search")
  })
})

describe("search adapter: matching", () => {
  test("query covers continuous Chinese fragments, English, digits, hyphens", () => {
    const tests: Array<[string, string]> = [
      ["测试", "测试标题"],
      ["中英", "中英混合 mixed-123"],
      ["mixed", "中英混合 mixed-123"],
      ["123", "中英混合 mixed-123"],
      ["mixed-123", "中英混合 mixed-123"],
      ["Graph", "graph view"],
    ]
    for (const [query, title] of tests) {
      assert.ok(
        matchesFilters(entry(title, { title }), { query: normalizeText(query), tags: [], folder: "" }),
        `query "${query}" should match "${title}"`,
      )
    }
  })

  test("multiple tags use AND; folder narrows the scope", () => {
    const onlyComponents = rankEntries(Object.values(INDEX), {
      query: "",
      tags: ["component"],
      folder: "features",
    })
    for (const result of onlyComponents) {
      assert.ok(result.tags.map(normalizeTag).includes("component"))
      assert.ok(result.folder === "features" || result.folder.startsWith("features/"))
    }
    assert.ok(onlyComponents.length > 0)

    const andComponentsGuide = rankEntries(Object.values(INDEX), {
      query: "",
      tags: ["component", "guide"],
      folder: "getting-started",
    })
    for (const result of andComponentsGuide) {
      const tags = result.tags.map(normalizeTag)
      assert.ok(tags.includes("component") && tags.includes("guide"))
      assert.strictEqual(result.folder, "getting-started")
    }
  })

  test("unknown tag or folder yields no results", () => {
    const noTags = rankEntries(Object.values(INDEX), {
      query: "",
      tags: ["does-not-exist"],
      folder: "",
    })
    assert.deepStrictEqual(noTags, [])
    const noFolder = rankEntries(Object.values(INDEX), {
      query: "",
      tags: [],
      folder: "nested/unknown/folder",
    })
    assert.deepStrictEqual(noFolder, [])
    assert.deepStrictEqual(
      rankEntries(Object.values(INDEX), { query: "", tags: [], folder: "features2" }),
      [],
    )
  })

  test("folder=features matches features and subfolders, not other folders", () => {
    const results = rankEntries(Object.values(INDEX), {
      query: "",
      tags: [],
      folder: "features",
    })
    const folders = new Set(results.map((r) => r.folder))
    for (const folder of folders) {
      assert.ok(folder === "features" || folder.startsWith("features/"))
    }
    assert.ok(results.some((r) => r.folder === "features/sub"))
    assert.ok(!results.some((r) => r.folder === "getting-started"))
  })

  test("empty query with a filter returns matching published pages; alone shows initial state", () => {
    const filtered = searchIndex(INDEX, { query: "", tags: [], folder: "getting-started" })
    assert.ok(filtered.length >= 2)
  })
})

describe("search adapter: ranking and determinism", () => {
  test("title matches outrank content matches", () => {
    const index: SearchIndex = {
      pageA: entry("pageA", { title: "安装指南", content: " unrelated Mixed-123 content" }),
      pageB: entry("pageB", { title: "some other title Mixed-123" }),
    }
    const [first, second] = rankEntries(Object.values(index), {
      query: "mixed-123",
      tags: [],
      folder: "",
    })
    assert.strictEqual(first.slug, "pageB")
    assert.strictEqual(second.slug, "pageA")
  })

  test("slug ascending is the final tie-breaker", () => {
    const results = rankEntries(Object.values(INDEX), {
      query: "",
      tags: ["component"],
      folder: "features",
    })
    const slugs = results.map((r) => r.slug)
    const alpha = slugs.indexOf("features/alpha-tie-breaker")
    const zulu = slugs.indexOf("features/zulu-tie-breaker")
    assert.ok(alpha !== -1 && zulu !== -1)
    assert.ok(alpha < zulu)
  })

  test("repeated calls with the same input return identical order", () => {
    const filters = { query: "", tags: ["component"], folder: "features" }
    const first = rankEntries(Object.values(INDEX), filters).map((r) => r.slug)
    const second = rankEntries(Object.values(INDEX), filters).map((r) => r.slug)
    assert.deepStrictEqual(first, second)
  })

  test("folder with filter and empty query still recurses into subfolders", () => {
    const results = rankEntries(Object.values(INDEX), {
      query: "",
      tags: ["component"],
      folder: "features",
    })
    assert.ok(results.some((r) => r.slug === "features/sub/deep-page"))
  })

  test("description falls back to fixed text when missing", () => {
    const results = rankEntries(
      [entry("empty", { title: "empty", content: "", description: "" })],
      { query: "", tags: [], folder: "" },
    )
    assert.strictEqual(results[0].description, FALLBACK_DESCRIPTION)
  })
})

describe("search adapter: index states", () => {
  test("index missing (null) and unparseable return empty results without throwing", () => {
    assert.deepStrictEqual(searchIndex(null, { query: "测试", tags: [], folder: "" }), [])
    assert.deepStrictEqual(
      searchIndex({} as unknown as SearchIndex, { query: "测试", tags: [], folder: "" }),
      [],
    )
  })

  test("folder derivation is relative to slug, not file layout", () => {
    assert.strictEqual(pageFolder("getting-started/installation"), "getting-started")
    assert.strictEqual(pageFolder("index"), "")
  })
})

describe("fixture published boundary", () => {
  test("draft, unlisted, and private pages never enter the public index", () => {
    const slugs = Object.keys(INDEX)
    assert.ok(!slugs.includes("features/draft-note"))
    assert.ok(!slugs.includes("features/unlisted-note"))
    assert.ok(!slugs.includes("features/private-note"))
    assert.ok(slugs.includes("features/backlinks"))
    assert.ok(slugs.includes("features/sub/deep-page"))
    assert.ok(slugs.includes("getting-started/installation"))
  })

  test("virtual folder/tag pages are never indexed as content pages", () => {
    const slugs = Object.keys(INDEX)
    assert.ok(!slugs.includes("tags/component"))
    assert.ok(!slugs.includes("features/index"))
  })
})
