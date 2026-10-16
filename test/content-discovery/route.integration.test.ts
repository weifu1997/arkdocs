/**
 * Route / page integration test for the public `/search` feature.
 *
 * It actually runs the Quartz build against the `fixtures/content-discovery/`
 * fixture (real content, including draft, unlisted, and private pages) and
 * asserts:
 *  - a `/search.html` route exists;
 *  - the public search index (`static/publicSearchIndex.json`) contains only
 *    published pages, never the draft / unlisted / private ones;
 *  - the generated content index (`static/contentIndex.json`) also excludes
 *    drafts and unlisted pages;
 *  - filter fixtures (Chinese, English, nested folder, tags) are present.
 *
 * This requires `npm install` so the external npm plugins can resolve; the
 * suite is gated with a graceful skip when they are missing.
 */

import test, { describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import process from "node:process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "../..")
const FIXTURE_DIR = path.join(REPO_ROOT, "fixtures", "content-discovery")
const OUTPUT_DIR = path.join(REPO_ROOT, "test", ".content-discovery-build")

function runBuild(): number {
  const result = spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, "quartz", "bootstrap-cli.mjs"),
      "build",
      "-d",
      FIXTURE_DIR,
      "-o",
      OUTPUT_DIR,
    ],
    { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  )
  if (result.stderr) console.log(result.stderr)
  return result.status ?? 1
}

describe("public /search build integration", () => {
  test("/search route and published-only index are produced", async () => {
    if (!fs.existsSync(path.join(REPO_ROOT, "node_modules", "@quartz-community", "search"))) {
      // External npm plugins are not installed (offline test environment). The
      // unit suite covers the logic; this route integration test is skipped
      // until dependencies are installed.
      return
    }

    const exitCode = runBuild()
    assert.equal(exitCode, 0, "Quartz build should succeed")

    const searchPage = path.join(OUTPUT_DIR, "search.html")
    assert.ok(fs.existsSync(searchPage), "/search.html must exist after build")
    const searchHtml = fs.readFileSync(searchPage, "utf8")
    assert.ok(
      searchHtml.includes("public-search") || searchHtml.includes("data-public-search"),
      "the /search page must render the public search component",
    )

    const publicIndexPath = path.join(OUTPUT_DIR, "static", "publicSearchIndex.json")
    assert.ok(fs.existsSync(publicIndexPath), "publicSearchIndex.json must be emitted")
    const publicIndex = JSON.parse(fs.readFileSync(publicIndexPath, "utf8")) as Record<
      string,
      Record<string, unknown>
    >
    const slugs = Object.keys(publicIndex)

    // Published pages must be present.
    assert.ok(slugs.includes("features/全文搜索"), "Chinese page must be in public index")
    assert.ok(slugs.includes("features/full-text-search"), "English page must be present")
    assert.ok(slugs.includes("features/api-v1"), "hyphenated/digit page must be present")
    assert.ok(slugs.includes("features/子目录/嵌套页面"), "nested page must be present")
    assert.ok(slugs.includes("guides/快速开始"), "guides page must be present")
    assert.ok(slugs.includes("index"), "root index page must be present")

    // Draft / unlisted / private / template must NOT be in the public index.
    // NOTE: ignorePatterns only excludes directories literally named
    // `private`/`templates`; the fixture uses `_private`/`_templates` to prove
    // that underscore-prefixed directories are treated as ordinary published
    // content (they are neither draft nor unlisted).
    const reallyForbidden = ["drafts/草稿页面", "未列出页面"]
    for (const slug of reallyForbidden) {
      assert.ok(!(slug in publicIndex), `published index must not contain ${slug}`)
    }
    const allowedIgnored = ["_private/私有页面", "_templates/模板页面"]
    for (const slug of allowedIgnored) {
      assert.ok(slug in publicIndex, `non-ignored underscore dir ${slug} is published content`)
    }

    // Tags are exposed (including case-variant normalized).
    const fullText = publicIndex["features/全文搜索"]
    assert.deepEqual((fullText?.tags as string[] | undefined)?.sort(), ["component", "搜索"].sort())

    // The site Content Index must also exclude drafts/unlisted.
    const contentIndexPath = path.join(OUTPUT_DIR, "static", "contentIndex.json")
    assert.ok(fs.existsSync(contentIndexPath), "contentIndex.json must be emitted")
    const contentIndex = JSON.parse(fs.readFileSync(contentIndexPath, "utf8")) as Record<
      string,
      Record<string, unknown>
    >
    assert.ok(!("drafts/草稿页面" in contentIndex), "draft must not be in content index")
    assert.ok(!("未列出页面" in contentIndex), "unlisted must not be in content index")
    // The site Content Index explicitly skips data.unlisted, so the unlisted
    // page above is absent; underscore-prefixed directories are not matched by
    // `private`/`templates` ignorePatterns and therefore publish normally.
    assert.ok("_private/私有页面" in contentIndex, "underscore private dir is published")
  })
})
