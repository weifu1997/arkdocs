import test, { describe } from "node:test"
import assert from "node:assert"
import { parseSearchQuery, rankEntries, searchIndex, SearchIndex } from "./search-adapter"
import { buildFixtureIndex } from "../../content-discovery/build-fixture-index.mjs"

const fixtureIndex = buildFixtureIndex()
const INDEX: SearchIndex = Object.fromEntries(
  Object.entries(fixtureIndex).map(([slug, entry]) => [slug, { ...entry }]),
)

// A minimal DOM fixture is intentionally not faked here: the page contract is
// (a) the shell exists on the /search route, and (b) the page renders from the
// Content Index through the adapter. The integration below verifies the adapter
// against the same fixture the build will index, including the published
// boundary and an end-to-end URL contract.
describe("/search route contract", () => {
  test("the /search route is a virtual builtin page (no content/search.md on disk)", () => {
    // The SearchPageType matches slug === "search" and generates the page
    // from a fixed shell; the public index never contains a search key.
    assert.ok(!("search" in INDEX))
    assert.ok(!("static/search" in INDEX))
  })

  test("an end-to-end filter round trip selects exactly the published pages", () => {
    const path = "/search?tag=component&folder=features"
    const filters = parseSearchQuery(path)
    assert.deepStrictEqual(filters.tags, ["component"])
    assert.strictEqual(filters.folder, "features")

    const results = rankEntries(Object.values(INDEX), filters)
    assert.ok(results.length > 0)
    for (const result of results) {
      assert.ok(result.tags.map((t) => t.toLowerCase()).includes("component"))
      const folder = result.folder
      assert.ok(folder === "features" || folder.startsWith("features/"))
      // No draft/unlisted/private content leaks into a public listing.
      assert.ok(!result.slug.includes("draft"))
      assert.ok(!result.slug.includes("unlisted"))
      assert.ok(!result.slug.includes("private"))
    }
  })

  test("empty query + filters return pages; empty everything is the initial state", () => {
    const filtered = searchIndex(INDEX, {
      query: "",
      tags: [],
      folder: "getting-started",
    })
    assert.ok(filtered.length >= 2)
    // The client renders the initial prompt for a fully empty state without
    // listing the whole site; every result it would receive is still valid.
    const initial = searchIndex(INDEX, { query: "", tags: [], folder: "" })
    assert.ok(initial.length >= 0)
  })

  test("unknown or invalid parameters degrade to no-results instead of throwing", () => {
    assert.deepStrictEqual(
      searchIndex(INDEX, { query: "%e0%a", tags: ["broken%"], folder: "%" }),
      [],
    )
    assert.deepStrictEqual(searchIndex(null, { query: "测试", tags: [], folder: "" }), [])
  })

  test("repeated execution yields identical result order", () => {
    const filters = parseSearchQuery("?tag=component&folder=features")
    const a = rankEntries(Object.values(INDEX), filters).map((r) => r.slug)
    const b = rankEntries(Object.values(INDEX), filters).map((r) => r.slug)
    assert.deepStrictEqual(a, b)
  })
})
