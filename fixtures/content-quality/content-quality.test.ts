import test, { describe } from "node:test"
import assert from "node:assert"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const CLI = path.join(REPO_ROOT, "scripts", "check-content.mjs")
// 本测试文件即位于 fixtures/content-quality/，坏样本目录就是当前目录。
const QUALITY_ROOT = path.dirname(fileURLToPath(import.meta.url))
const VALID_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "content-quality-valid",
)

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("node", [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

function runCliFromCwd(cwd: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("node", [CLI, ...args], {
    cwd,
    encoding: "utf8",
  })
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

/** Parse the JSON report the CLI emits to stdout for --format json. */
function parseJson(stdout: string) {
  return JSON.parse(stdout)
}

function issueOf(report: any, ruleId: string, file: string) {
  return report.issues.find(
    (issue: any) => issue.ruleId === ruleId && issue.file === file,
  )
}

describe("content-quality CLI exit codes", () => {
  test("exits 1 with errors when --root points at the bad fixture", () => {
    const result = runCli(["--root", QUALITY_ROOT, "--format", "json", "--output", "reports/quality.json"])
    assert.notStrictEqual(result.status, 0, "expected non-zero exit")
  })

  test("exits 0 for the valid fixture (warnings only are allowed)", () => {
    const result = runCli(["--root", VALID_ROOT, "--format", "json"])
    assert.strictEqual(result.status, 0, `expected exit 0, got ${result.stdout + result.stderr}`)
    const report = parseJson(result.stdout)
    assert.strictEqual(report.summary.error, 0)
  })

  test("exits 2 for an unknown argument", () => {
    const result = runCli(["--root", QUALITY_ROOT, "--bogus"])
    assert.strictEqual(result.status, 2)
  })

  test("exits 2 when the content directory does not exist", () => {
    const result = runCli(["--root", "no-such-content-dir"])
    assert.strictEqual(result.status, 2)
  })

  test("exits 2 when --output is given without --format json", () => {
    const result = runCli(["--root", QUALITY_ROOT, "--output", "reports/x.json"])
    assert.strictEqual(result.status, 2)
  })

  test("exits 2 for a missing --root value", () => {
    const result = runCli(["--root"])
    assert.strictEqual(result.status, 2)
  })

  test("the JSON report written by --output is parseable and identical to stdout", () => {
    const outputFile = path.join(REPO_ROOT, "reports", "quality-e2e.json")
    fs.rmSync(outputFile, { force: true })
    const result = runCli(["--root", QUALITY_ROOT, "--format", "json", "--output", "reports/quality-e2e.json"])
    assert.strictEqual(result.status, 1)
    const reportFromStdout = parseJson(result.stdout)
    const reportFromFile = parseJson(fs.readFileSync(outputFile, "utf8"))
    assert.deepStrictEqual(reportFromFile, reportFromStdout)
    // summaries go to stderr, not stdout
    assert.ok(result.stderr.includes("error"))
  })
})

describe("content-quality JSON report structure", () => {
  const result = runCli(["--root", QUALITY_ROOT, "--format", "json"])
  const report = parseJson(result.stdout)

  test("report has schemaVersion, scan root, stats and summary", () => {
    assert.strictEqual(report.schemaVersion, "1")
    assert.strictEqual(report.root, "fixtures/content-quality")
    assert.ok(typeof report.stats.documents === "number")
    assert.ok(report.stats.documents > 0)
    assert.strictEqual(report.summary.error >= 1, true)
  })

  test("issues are sorted deterministically", () => {
    const keys = report.issues.map((issue: any) => [issue.file, issue.ruleId, issue.line])
    const sorted = [...keys].sort()
    assert.deepStrictEqual(keys, sorted)
  })

  test("every issue carries ruleId, level, file, line, raw target and description", () => {
    for (const issue of report.issues) {
      assert.ok(issue.ruleId)
      assert.ok(["error", "warning"].includes(issue.level))
      assert.ok(issue.file)
      assert.ok(typeof issue.line === "number")
      assert.ok(issue.description)
    }
  })

  test("report paths are relative POSIX paths without absolute machine paths", () => {
    for (const issue of report.issues) {
      assert.ok(!path.isAbsolute(issue.file))
      assert.ok(!issue.file.includes("\\"))
    }
  })
})

describe("quality rules", () => {
  const result = runCli(["--root", QUALITY_ROOT, "--format", "json"])
  const report = parseJson(result.stdout)

  test("page-link-missing flags a broken wikilink target", () => {
    const issue = issueOf(report, "page-link-missing", "broken-links.md")
    assert.ok(issue, "expected page-link-missing for broken-links.md")
    assert.ok(issue.rawTarget.includes("does-not-exist"))
    assert.strictEqual(issue.level, "error")
  })

  test("asset-missing flags a missing image reference", () => {
    const issue = issueOf(report, "asset-missing", "broken-links.md")
    assert.ok(issue, "expected asset-missing for broken-links.md")
    assert.ok(issue.rawTarget.includes("missing"))
  })

  test("heading-missing flags a link to a nonexistent heading", () => {
    const issue = issueOf(report, "heading-missing", "broken-links.md")
    assert.ok(issue, "expected heading-missing for broken-links.md")
    assert.ok(issue.rawTarget.includes("no-heading"))
  })

  test("duplicate-slug flags cross-platform path collisions (duplicate.md vs duplicate/index.md)", () => {
    const issues = report.issues.filter(
      (issue: any) => issue.ruleId === "duplicate-slug",
    )
    const files = issues.map((issue: any) => issue.file)
    assert.ok(files.includes("duplicate.md"))
    assert.ok(files.includes("duplicate/index.md"))
    for (const issue of issues) {
      assert.strictEqual(issue.level, "error")
    }
  })

  test("frontmatter-missing flags a page without frontmatter", () => {
    const issue = issueOf(report, "frontmatter-missing", "missing-fm.md")
    assert.ok(issue)
    assert.strictEqual(issue.level, "error")
  })

  test("frontmatter-parse-failed flags broken YAML", () => {
    const issue = issueOf(report, "frontmatter-parse-failed", "bad-yaml.md")
    assert.ok(issue)
    assert.strictEqual(issue.level, "error")
  })

  test("title-missing flags a page with an invalid title", () => {
    const issue = issueOf(report, "title-missing", "no-title.md")
    assert.ok(issue)
    assert.strictEqual(issue.level, "error")
  })

  test("frontmatter-field-type flags unsafe field types", () => {
    const issue = issueOf(report, "frontmatter-field-type", "field-types.md")
    assert.ok(issue)
    assert.strictEqual(issue.level, "warning")
  })

  test("unsupported-syntax flags fenced code and inline code placeholders", () => {
    const issue = issueOf(report, "unsupported-syntax", "code-examples.md")
    assert.ok(issue, "expected unsupported-syntax for code-examples.md")
  })

  test("externally linked pages are not reported as broken", () => {
    const external = report.issues.filter(
      (issue: any) => issue.ruleId === "page-link-missing" && issue.file === "good-links.md",
    )
    assert.strictEqual(external.length, 0)
  })

  test("example placeholder links in prose are ignored", () => {
    const placeholders = report.issues.filter(
      (issue: any) => issue.file === "code-examples.md" && issue.ruleId !== "unsupported-syntax",
    )
    assert.strictEqual(placeholders.length, 0)
  })
})

describe("valid fixture", () => {
  test("the valid fixture contains no error-level issues", () => {
    const result = runCli(["--root", VALID_ROOT, "--format", "json"])
    assert.strictEqual(result.status, 0)
    const report = parseJson(result.stdout)
    const errors = report.issues.filter((issue: any) => issue.level === "error")
    assert.deepStrictEqual(errors, [])
  })

  test("relative links with Chinese/space paths resolve inside the valid fixture", () => {
    const result = runCli(["--root", VALID_ROOT, "--format", "json"])
    const report = parseJson(result.stdout)
    const errors = report.issues.filter((issue: any) => issue.level === "error")
    assert.deepStrictEqual(errors, [])
  })
})

describe("default content/ scan", () => {
  test("scanning the real content/ from the repo root exits 0", () => {
    const result = runCli([])
    assert.strictEqual(result.status, 0, result.stdout + result.stderr)
  })
})
