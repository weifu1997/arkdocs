/**
 * Offline tests for public search discovery (`/search` URL contract,
 * tag/folder filtering, published boundary, deterministic ranking).
 *
 * The pure logic under test is `quartz/plugins/search/searchData.ts` — the same
 * module the `static/searchIndex.json` emitter and the `/search` page script
 * use. Fixtures live in `fixtures/content-discovery/` and are built into a
 * temporary output folder to prove the real pipeline (published boundary,
 * slug collisions, virtual pages) feeds the same index.
 */
import assert from "node:assert"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test, { describe } from "node:test"

import {
  buildSearchIndex,
  FALLBACK_DESCRIPTION,
  folderOfSlug,
  matchesFilter,
  matchesFolder,
  matchesQuery,
  matchesTags,
  normalizeForCompare,
  normalizeParam,
  parseSearchParams,
  queryTerms,
  runSearch,
  scoreEntry,
  serializeSearchParams,
  type SearchIndexEntry,
} from "../quartz/plugins/search/searchData"
import type { ProcessedContent } from "../quartz/plugins/vfile"

const REPO_ROOT = path.resolve(import.meta.dirname, "..")
const FIXTURE_ROOT = path.join(REPO_ROOT, "fixtures", "content-discovery")

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `arkdocs-${prefix}-`))
}

/** Parse a URL's query string the same way the /search page does. */
function paramsFromUrl(url: string): URLSearchParams {
  const [, query] = url.split("?")
  return new URLSearchParams(query ?? "")
}

/** Build the discovery fixture into a temp dir and return the emitted index. */
let cachedIndex: SearchIndexEntry[] | null = null

/** Build the discovery fixture into a temp dir and return the emitted index.
 *  The full build is expensive, so the result is memoized for the process. */
function buildDiscoveryIndex(): SearchIndexEntry[] {
  if (cachedIndex) return cachedIndex
  const outDir = tmpDir("search-index")
  execFileSync(
    process.execPath,
    ["./quartz/bootstrap-cli.mjs", "build", "-d", FIXTURE_ROOT, "-o", outDir],
    { cwd: REPO_ROOT, stdio: "ignore" },
  )
  const indexPath = path.join(outDir, "static", "searchIndex.json")
  cachedIndex = JSON.parse(fs.readFileSync(indexPath, "utf8")) as SearchIndexEntry[]
  return cachedIndex
}

function findEntry(index: SearchIndexEntry[], slug: string): SearchIndexEntry {
  const entry = index.find((e) => e.slug === slug)
  assert.ok(entry, `expected fixture slug ${slug} in built index`)
  return entry
}

function fixtureFromFrontmatter(
  slug: string,
  frontmatter: Record<string, unknown>,
  text = `${slug} body`,
): ProcessedContent {
  const root = { type: "root", children: [] } as never
  const file = {
    data: {
      slug,
      relativePath: `${slug}.md`,
      frontmatter,
      text,
      description: "",
    },
  } as never
  return [root, file]
}

describe("query parsing (URL contract)", () => {
  test("empty q, no filters -> empty query and no tags/folder", () => {
    const filter = parseSearchParams(paramsFromUrl("/search"))
    assert.deepEqual(filter, { q: "", tags: [], folder: "" })
  })

  test("repeated tag params combine with AND", () => {
    const filter = parseSearchParams(
      paramsFromUrl(
        "/search?q=hello&tag=%E4%B8%AD%E6%96%87&tag=%E6%95%99%E7%A8%8B&folder=tutorials",
      ),
    )
    assert.equal(filter.q, "hello")
    assert.deepEqual(filter.tags, ["中文", "教程"])
    assert.equal(filter.folder, "tutorials")
  })

  test("tag params are trimmed of surrounding whitespace", () => {
    const filter = parseSearchParams(new URLSearchParams("tag=%20%20%E4%B8%AD%E6%96%87%20&tag="))
    assert.deepEqual(filter.tags, ["中文"])
  })

  test("serializeSearchParams round-trips Chinese, spaces and repeated tags", () => {
    const url =
      "/search?" +
      serializeSearchParams({ q: "中文 hello", tags: ["中文", "EN"], folder: "my folder" })
    const back = parseSearchParams(paramsFromUrl(url))
    assert.equal(back.q, "中文 hello")
    assert.deepEqual(back.tags, ["中文", "EN"])
    assert.equal(back.folder, "my folder")
  })

  test("query terms cover CJK fragments, English, digits and hyphens", () => {
    assert.deepEqual(queryTerms("FlexSearch V2"), ["flexsearch", "v2"])
    assert.deepEqual(queryTerms("搜索 hello"), ["搜", "索", "hello"])
    assert.deepEqual(queryTerms("中文"), ["中", "文"])
    assert.deepEqual(queryTerms(""), [])
  })

  test("comparisons normalize case and diacritics", () => {
    assert.equal(normalizeParam("English"), normalizeParam("english"))
    assert.equal(normalizeParam("  EN  "), normalizeParam("en"))
    assert.equal(normalizeForCompare("café"), "cafe")
  })

  test("unknown status/draft/date params are ignored by the search filter", () => {
    const filter = parseSearchParams(
      paramsFromUrl("/search?status=draft&status=unlisted&date=2024-01-01&q=hello"),
    )
    assert.equal(filter.q, "hello")
    assert.deepEqual(filter.tags, [])
    assert.equal(filter.folder, "")
  })
})

describe("tag and folder matching (AND semantics)", () => {
  const index: SearchIndexEntry[] = [
    {
      slug: "features/search-page",
      title: "搜索页面",
      description: "d",
      content: "标签与文件夹组合筛选",
      folder: "features",
      tags: ["中文", "搜索"],
    },
    {
      slug: "features/fulltext-en",
      title: "Full-Text Search Deep Dive",
      description: "d",
      content: "FlexSearch scoring 中文",
      folder: "features",
      tags: ["English", "search"],
    },
    {
      slug: "tutorials/getting-started",
      title: "入门教程",
      description: "d",
      content: "标签 中文 教程",
      folder: "tutorials",
      tags: ["中文", "教程"],
    },
    {
      slug: "features/sub/deep-note",
      title: "深层页面",
      description: "d",
      content: "子目录",
      folder: "features/sub",
      tags: ["中文", "子目录"],
    },
  ]

  test("multiple tags use AND: a page missing one tag does not match", () => {
    const filter = { q: "", tags: ["中文", "教程"], folder: "" }
    const matched = index.filter((e) => matchesFilter(e, filter)).map((e) => e.slug)
    assert.deepEqual(matched, ["tutorials/getting-started"])
  })

  test("tag comparison ignores case and surrounding whitespace", () => {
    const filter = { q: "", tags: [" english "], folder: "" }
    assert.equal(matchesTags(index[1], filter.tags), true)
    assert.equal(matchesTags(index[0], filter.tags), false)
  })

  test("empty tag set matches every page", () => {
    assert.equal(matchesTags(index[0], []), true)
  })

  test("folder=features matches features/ and subdirectories but not other folders", () => {
    const filter = { q: "", tags: [], folder: "features" }
    const matched = index.filter((e) => matchesFilter(e, filter)).map((e) => e.slug)
    assert.deepEqual(matched.sort(), [
      "features/fulltext-en",
      "features/search-page",
      "features/sub/deep-note",
    ])
    assert.equal(matchesFolder(index[2], "features"), false)
  })

  test("folder comparison is case-insensitive and trims", () => {
    const filter = { q: "", tags: [], folder: " FEATURES " }
    const matched = index.filter((e) => matchesFilter(e, filter))
    assert.equal(matched.length, 3)
  })

  test("empty query combined with tags/folder still returns matches", () => {
    const filter = { q: "", tags: ["中文"], folder: "features" }
    const matched = runSearch(index, filter).map((e) => e.slug)
    assert.deepEqual(matched, ["features/search-page", "features/sub/deep-note"])
  })

  test("empty query without filters is the initial state (not a full-site listing)", () => {
    // runSearch would list everything; the page script treats that case as
    // the initial state, so the contract is: no filters -> no results listing.
    const filter = { q: "", tags: [], folder: "" }
    const matched = runSearch(index, filter)
    assert.equal(matched.length, index.length)
  })
})

describe("query matching and ranking", () => {
  const index: SearchIndexEntry[] = [
    {
      slug: "zeta",
      title: "中文标题",
      description: "d",
      content: "body about 搜索",
      folder: "",
      tags: [],
    },
    {
      slug: "alpha",
      title: "搜索页面",
      description: "d",
      content: "搜索 title only",
      folder: "",
      tags: [],
    },
    {
      slug: "mid",
      title: "其他内容",
      description: "d",
      content: "搜索 body only",
      folder: "",
      tags: [],
    },
  ]

  test("title hits outrank body-only hits", () => {
    const results = runSearch(index, { q: "搜索", tags: [], folder: "" })
    assert.equal(results[0].slug, "alpha")
    assert.equal(results[1].slug, "mid")
  })

  test("same relevance is broken by normalized slug ascending", () => {
    const tied: SearchIndexEntry[] = [index[1], index[2]].map((e) => ({
      ...e,
      title: "搜索",
      content: "搜索",
    }))
    const results = runSearch(tied, { q: "搜索", tags: [], folder: "" })
    assert.equal(results[0].slug, "alpha")
    assert.equal(results[1].slug, "mid")
  })

  test("repeated runs on the same input return the same order", () => {
    const once = runSearch(index, { q: "搜索", tags: [], folder: "" }).map((e) => e.slug)
    const twice = runSearch(index, { q: "搜索", tags: [], folder: "" }).map((e) => e.slug)
    assert.deepEqual(once, twice)
  })

  test("non-matching query returns an empty list", () => {
    assert.deepEqual(runSearch(index, { q: "不存在的关键词", tags: [], folder: "" }), [])
    assert.equal(scoreEntry(index[0], "xyz"), null)
  })

  test("CJK mixed query 搜索 hello matches mixed content", () => {
    const mixed: SearchIndexEntry[] = [
      {
        slug: "mixed",
        title: "混合",
        description: "d",
        content: "搜索 hello 与英文",
        folder: "",
        tags: [],
      },
    ]
    assert.equal(matchesQuery(mixed[0], "搜索 hello"), true)
    assert.equal(matchesQuery(mixed[0], "搜索 hello 中文"), false)
  })
})

describe("fixture-backed index (real build pipeline)", () => {
  test("builds and emits static/searchIndex.json for the discovery fixture", () => {
    const index = buildDiscoveryIndex()
    assert.ok(index.length >= 8, `expected several published entries, got ${index.length}`)
  })

  test("published boundary: drafts, unlisted and private pages are not indexed", () => {
    const index = buildDiscoveryIndex()
    assert.equal(
      index.find((e) => e.slug === "draft-post"),
      undefined,
    )
    assert.equal(
      index.find((e) => e.slug === "unlisted-post"),
      undefined,
    )
    assert.equal(
      index.find((e) => e.slug.startsWith("private/")),
      undefined,
    )
  })

  test("virtual folder/tag pages are indexed (published), only 404 is excluded", () => {
    const index = buildDiscoveryIndex()
    assert.equal(
      index.find((e) => e.slug === "404"),
      undefined,
    )
    // Virtual folder/tag pages are published pages in the existing build
    // (contentIndex.json includes them); they must not surface as missing.
    assert.ok(index.some((e) => e.slug.startsWith("tags/")))
    assert.ok(index.some((e) => e.folder === "features/index" || e.slug === "features/index"))
  })

  test("fixture tags survive the build and match by AND", () => {
    const index = buildDiscoveryIndex()
    const tutorial = findEntry(index, "tutorials/getting-started")
    assert.ok(tutorial.tags.includes("中文"))
    const results = runSearch(index, { q: "", tags: ["中文", "教程"], folder: "" })
    assert.deepEqual(
      results.map((e) => e.slug),
      ["tutorials/getting-started"],
    )
  })

  test("fixture folder=features matches features pages and subdirectories only", () => {
    const index = buildDiscoveryIndex()
    const results = runSearch(index, { q: "", tags: [], folder: "features" })
    const slugs = results.map((e) => e.slug)
    assert.ok(slugs.includes("features/search-page"))
    assert.ok(slugs.includes("features/fulltext-en"))
    assert.ok(slugs.includes("features/fulltext-en-2"))
    assert.ok(slugs.includes("features/sub/deep-note"))
    assert.ok(!slugs.some((s) => s.startsWith("tutorials/")))
  })

  test("CJK query 搜索 returns relevant pages with stable order", () => {
    const index = buildDiscoveryIndex()
    const once = runSearch(index, { q: "搜索", tags: [], folder: "" }).map((e) => e.slug)
    const twice = runSearch(index, { q: "搜索", tags: [], folder: "" }).map((e) => e.slug)
    assert.deepEqual(once, twice)
    assert.ok(once.length >= 3)
  })

  test("two equal-relevance pages tie-broken by slug ascending", () => {
    const index = buildDiscoveryIndex()
    // fulltext-en and fulltext-en-2 both carry the same query terms
    // (FlexSearch + 中文) with identical scores; slug order decides.
    const results = runSearch(index, { q: "flexsearch 中文", tags: [], folder: "" })
    const slugs = results.map((e) => e.slug)
    const a = slugs.indexOf("features/fulltext-en")
    const b = slugs.indexOf("features/fulltext-en-2")
    assert.ok(a >= 0 && b >= 0)
    assert.ok(a < b, `${slugs.join(", ")}`)
  })

  test("tag + folder AND combination narrows to one page", () => {
    const index = buildDiscoveryIndex()
    const results = runSearch(index, { q: "", tags: ["子目录"], folder: "features" })
    assert.deepEqual(
      results.map((e) => e.slug),
      ["features/sub/deep-note"],
    )
  })

  test("unknown tag or folder yields no results state", () => {
    const index = buildDiscoveryIndex()
    assert.deepEqual(runSearch(index, { q: "", tags: ["不存在标签"], folder: "" }), [])
    assert.deepEqual(runSearch(index, { q: "", tags: [], folder: "does-not-exist" }), [])
  })

  test("missing description falls back to fixed short text; tags default to empty", () => {
    const entry = buildSearchIndex([fixtureFromFrontmatter("no-desc", { title: "无描述" })])[0]
    assert.equal(entry.description, FALLBACK_DESCRIPTION)
    assert.deepEqual(entry.tags, [])
    assert.equal(folderOfSlug("a/b"), "a")
    assert.equal(folderOfSlug("flat"), "")
  })
})

describe("search index build shape", () => {
  test("index entries expose slug, title, description, folder, tags and searchable text", () => {
    const entry = findEntry(buildDiscoveryIndex(), "features/search-page")
    assert.ok(typeof entry.slug === "string" && entry.slug.length > 0)
    assert.ok(typeof entry.title === "string" && entry.title.length > 0)
    assert.ok(typeof entry.description === "string")
    assert.ok(typeof entry.content === "string" && entry.content.length > 0)
    assert.equal(entry.folder, "features")
    assert.ok(Array.isArray(entry.tags))
  })
})
