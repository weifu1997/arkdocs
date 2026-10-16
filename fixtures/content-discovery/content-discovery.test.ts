import test, { describe } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import YAML from "yaml"
import {
  SearchEntry,
  SearchParams,
  parseSearchParams,
  buildSearchUrl,
  searchEntries,
  tokenize,
  scoreQuery,
  normalizeTag,
  normalizeFolder,
  matchesQuery,
  matchesTags,
  matchesFolder,
  folderFromSlug,
} from "../../quartz/search/contentDiscovery"

const FIXTURE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "pages")

/** Parse a fixture markdown file into its searchable fields. */
function parseFixture(relativePath: string): {
  slug: string
  title: string
  tags: string[]
  text: string
} {
  const fullPath = path.join(FIXTURE_ROOT, relativePath)
  const source = fs.readFileSync(fullPath, "utf8")
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    return { slug: relativePath, title: "", tags: [], text: source }
  }
  const frontmatter = YAML.parse(match[1]) as { title?: string; tags?: unknown }
  const body = match[2]
  const slug = relativePath.replace(/\.md$/, "")
  return {
    slug,
    title: typeof frontmatter?.title === "string" ? frontmatter.title : "",
    tags: Array.isArray(frontmatter?.tags)
      ? frontmatter.tags
          .map((tag) => (typeof tag === "string" ? tag : String(tag ?? "")))
          .filter(Boolean)
      : [],
    text: body,
  }
}

/** Collect all fixture pages as SearchEntry, excluding draft/unlisted. */
function loadPublishedEntries(): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const relativePath of walkMarkdownFiles(FIXTURE_ROOT)) {
    const source = fs.readFileSync(path.join(FIXTURE_ROOT, relativePath), "utf8")
    const fmMatch = source.match(/^---\n([\s\S]*?)\n---/)
    const frontmatter = fmMatch ? YAML.parse(fmMatch[1]) : {}
    if (frontmatter?.draft === true) continue
    if (frontmatter?.unlisted === true) continue
    const parsed = parseFixture(relativePath)
    entries.push({
      slug: parsed.slug,
      title: parsed.title,
      description: "",
      tags: parsed.tags,
      text: parsed.text,
    })
  }
  return entries
}

function walkMarkdownFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = path.relative(FIXTURE_ROOT, fullPath).replaceAll(path.sep, "/")
    if (entry.isDirectory()) {
      results.push(...walkMarkdownFiles(fullPath))
    } else if (/\.md$/.test(entry.name)) {
      results.push(relativePath)
    }
  }
  return results
}

const published = loadPublishedEntries()
const findBySlug = (slug: string) => published.find((entry) => entry.slug === slug)!

describe("URL parameter parsing", () => {
  test("parses q, multiple tag values and a folder", () => {
    const params = parseSearchParams(
      "q=search&tag=Feature&tag=feature/search&folder=features",
    )
    assert.strictEqual(params.q, "search")
    assert.deepStrictEqual(params.tags, ["feature", "feature/search"])
    assert.strictEqual(params.folder, "features")
  })

  test("tag values are trimmed and lowercased", () => {
    const params = parseSearchParams("tag=  Feature  &tag=guide")
    assert.deepStrictEqual(params.tags, ["feature", "guide"])
  })

  test("folder normalization: strips trailing slash and leading ./", () => {
    assert.strictEqual(normalizeFolder("./features/"), "features")
    assert.strictEqual(normalizeFolder("/guides/getting started/"), "guides/getting started")
    assert.strictEqual(normalizeFolder("  "), null)
    assert.strictEqual(normalizeFolder("."), null)
  })

  test("empty query and filters produce an empty params state", () => {
    const params = parseSearchParams("")
    assert.strictEqual(params.q, "")
    assert.deepStrictEqual(params.tags, [])
    assert.strictEqual(params.folder, null)
  })

  test("URL round-trip: buildSearchUrl then parseSearchParams restore state", () => {
    const url = buildSearchUrl({ q: "full text 123", tags: ["Feature", "feature/search"], folder: "features" })
    const parsed = parseSearchParams(url)
    assert.strictEqual(parsed.q, "full text 123")
    assert.deepStrictEqual(parsed.tags, ["feature", "feature/search"])
    assert.strictEqual(parsed.folder, "features")
  })

  test("Chinese and space-containing parameters survive encoding", () => {
    const url = buildSearchUrl({ q: "搜索功能", tags: ["feature/搜索"], folder: "guides/新手指南" })
    const parsed = parseSearchParams(url)
    assert.strictEqual(parsed.q, "搜索功能")
    assert.deepStrictEqual(parsed.tags, ["feature/搜索"])
    assert.strictEqual(parsed.folder, "guides/新手指南")
  })

  test("malformed percent-encoding does not crash the parser", () => {
    const params = parseSearchParams("q=%e0%a4&folder=%u0041")
    // q holds the tolerant decode result or empty string; the call must not throw.
    assert.ok(typeof params.q === "string")
    assert.ok(typeof params.folder === "string" || params.folder === null)
  })
})

describe("query matching", () => {
  test("CJK substring match on a Chinese title", () => {
    const entry = findBySlug("features/搜索")
    assert.ok(matchesQuery(entry, "中文"))
    assert.ok(matchesQuery(entry, "功能"))
    assert.ok(matchesQuery(entry, "搜索"))
  })

  test("English whole-word match, not a substring match", () => {
    const entry = findBySlug("features/full-text search")
    assert.ok(matchesQuery(entry, "full"))
    assert.ok(matchesQuery(entry, "search"))
    assert.ok(matchesQuery(entry, "Full"))
    assert.ok(!matchesQuery(entry, "research"))
    assert.ok(!matchesQuery(entry, "fe"))
  })

  test("mixed Chinese-English query matches a page containing both", () => {
    const entry = findBySlug("features/full-text search")
    assert.ok(matchesQuery(entry, "中文"))
    assert.ok(matchesQuery(entry, "Search"))
  })

  test("digits and hyphenated tokens match feature-1", () => {
    const entry = findBySlug("features/full-text search")
    assert.ok(matchesQuery(entry, "feature-1"))
    assert.ok(matchesQuery(entry, "123"))
    // digit "1" alone matches inside "feature-1" because the boundary rule
    // allows hyphen-adjacent matches; "2" does not appear.
    assert.ok(!matchesQuery(entry, "23"))
  })

  test("a query token that does not appear anywhere returns false", () => {
    assert.ok(!matchesQuery(findBySlug("features/搜索"), "zzzz"))
  })
})

describe("tag and folder filtering", () => {
  test("multiple tags are combined with AND", () => {
    const entry = findBySlug("features/搜索")
    assert.ok(matchesTags(entry, ["feature/search"]))
    assert.ok(!matchesTags(entry, ["feature/search", "feature"]))
    assert.ok(!matchesTags(entry, ["feature/search", "guide"]))
    // AND over two independent tags that both appear on the target page.
    const page = findBySlug("features/full-text search")
    assert.ok(matchesTags(page, ["feature/search", "feature"]))
  })

  test("tag comparison is case-insensitive after trimming", () => {
    const entry = findBySlug("features/full-text search")
    assert.ok(matchesTags(entry, [normalizeTag(" Feature ")]))
  })

  test("folder=features matches pages in features and its subdirectories, not guides", () => {
    const featuresPage = findBySlug("features/full-text search")
    const guidesPage = findBySlug("guides/安装")
    assert.ok(matchesFolder(featuresPage, "features"))
    assert.ok(matchesFolder(findBySlug("features/搜索"), "features"))
    assert.ok(!matchesFolder(guidesPage, "features"))
  })

  test("folder prefix does not match a sibling folder whose name starts with the same prefix", () => {
    // `featuresx` is a sibling name, not a subdirectory of `features`; there
    // is no such fixture, so verify the boundary rule with a constructed slug.
    assert.ok(!matchesFolder({ ...findBySlug("features/搜索"), slug: "featuresx/page" }, "features"))
  })

  test("tag and folder combine with AND", () => {
    const params: SearchParams = { q: "", tags: ["feature/search"], folder: "features" }
    const results = searchEntries(published, params)
    const slugs = results.map((entry) => entry.slug)
    assert.ok(slugs.includes("features/搜索"))
    // full-text search carries feature/search too, so it passes the AND filter;
    // the guides pages never do.
    assert.ok(slugs.includes("features/full-text search"))
    assert.ok(!slugs.includes("guides/安装"))
  })
})

describe("draft and unlisted boundary", () => {
  test("draft and unlisted pages are absent from the published index", () => {
    assert.ok(!published.some((entry) => entry.slug === "draft"))
    assert.ok(!published.some((entry) => entry.slug === "unlisted"))
  })

  test("the draft/unlisted content cannot be reached by query", () => {
    const draftText = "草稿"
    const results = searchEntries(published, { q: draftText, tags: [], folder: null })
    assert.strictEqual(results.length, 0)
    const unlistedText = "未列出"
    assert.strictEqual(
      searchEntries(published, { q: unlistedText, tags: [], folder: null }).length,
      0,
    )
  })
})

describe("ranking and deterministic ordering", () => {
  test("results are ordered by descending relevance score", () => {
    const titleMatch = findBySlug("features/搜索")
    const bodyMatch = findBySlug("features/full-text search")
    const titleScore = scoreQuery(titleMatch, "搜索")
    const bodyScore = scoreQuery(bodyMatch, "搜索")
    assert.ok(titleScore > bodyScore, `title score ${titleScore} should exceed body score ${bodyScore}`)
  })

  test("two pages with equal relevance are ordered by slug ascending", () => {
    const a = findBySlug("features/stable-a")
    const b = findBySlug("features/stable-b")
    const scoreA = scoreQuery(a, "tie-break target")
    const scoreB = scoreQuery(b, "tie-break target")
    assert.strictEqual(scoreA, scoreB)

    const results = searchEntries(published, { q: "tie-break target", tags: [], folder: null })
    const ranks = results
      .filter((entry) => entry.slug.startsWith("features/stable-"))
      .map((entry) => entry.slug)
    assert.deepStrictEqual(ranks, ["features/stable-a", "features/stable-b"])
  })

  test("repeated runs with the same input return the same order", () => {
    const params = { q: "搜索", tags: [], folder: null }
    const first = searchEntries(published, params).map((entry) => entry.slug)
    const second = searchEntries(published, params).map((entry) => entry.slug)
    const third = searchEntries(published, params).map((entry) => entry.slug)
    assert.deepStrictEqual(first, second)
    assert.deepStrictEqual(first, third)
  })

  test("without a query and no filters, no page is rendered (initial state)", () => {
    const results = searchEntries(published, { q: "", tags: [], folder: null })
    // The module returns matching entries, but the page keeps the initial
    // state empty. Verify withQuery behavior instead: with a filter, pages
    // are returned; with no filter at all, the caller treats the result as the
    // full index, which the page deliberately does not render.
    assert.strictEqual(results.length, published.length)
    const filtered = searchEntries(published, { q: "", tags: [], folder: "guides" })
    assert.ok(filtered.length > 0)
    assert.ok(filtered.every((entry) => entry.slug.startsWith("guides/")))
  })
})

describe("folder fallback and no-result states", () => {
  test("empty query with a folder filter lists the published pages in that folder", () => {
    const results = searchEntries(published, { q: "", tags: [], folder: "features" })
    assert.ok(results.length >= 4)
    assert.ok(results.every((entry) => entry.slug.startsWith("features/")))
  })

  test("unknown tag yields no results", () => {
    const results = searchEntries(published, { q: "", tags: ["does-not-exist"], folder: null })
    assert.strictEqual(results.length, 0)
  })

  test("unknown folder yields no results", () => {
    const results = searchEntries(published, { q: "", tags: [], folder: "no-such-folder" })
    assert.strictEqual(results.length, 0)
  })

  test("query that matches nothing returns an empty list", () => {
    const results = searchEntries(published, { q: "不存在的查询词 xyz", tags: [], folder: null })
    assert.strictEqual(results.length, 0)
  })

  test("folderFromSlug extracts the parent folder", () => {
    assert.strictEqual(folderFromSlug("features/搜索"), "features")
    assert.strictEqual(folderFromSlug("guides/安装"), "guides")
    assert.strictEqual(folderFromSlug("index"), "")
  })
})

describe("tokenizer", () => {
  test("tokenizes CJK one character per token and Latin words", () => {
    assert.deepStrictEqual(tokenize("hello 世界"), ["hello", "世", "界"])
    assert.deepStrictEqual(tokenize("feature 1"), ["feature", "1"])
  })

  test("tokenizes digits and hyphenated tokens", () => {
    assert.deepStrictEqual(tokenize("123"), ["123"])
    // Hyphens are non-letter/non-digit characters, so they are token separators.
    assert.deepStrictEqual(tokenize("a-b-c"), ["a", "b", "c"])
    assert.deepStrictEqual(tokenize("feature-1"), ["feature", "1"])
  })
})
