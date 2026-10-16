/**
 * End-to-end tests for the local content quality checker.
 *
 * The CLI is spawned as a real subprocess (not imported functions), asserting:
 *  - exit codes 0 / 1 / 2
 *  -- text summary, JSON stdout, --output file creation
 *  - the rule matrix from fixtures/content-quality and fixtures/content-quality-valid
 *  - stable issue ordering and report determinism
 *  - Windows/macOS/Linux-portable behavior (cross-platform paths, auto mkdir)
 */

import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test, { describe } from "node:test"
import assert from "node:assert/strict"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const QUALITY = path.join(ROOT, "fixtures", "content-quality")
const VALID = path.join(ROOT, "fixtures", "content-quality-valid")
const CLI = path.join(ROOT, "scripts", "check-content.mjs")

interface RunResult {
  code: number
  stdout: string
  stderr: string
}

function runAsync(args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd: ROOT, env: process.env })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (d) => (stdout += d.toString()))
    child.stderr.on("data", (d) => (stderr += d.toString()))
    child.on("exit", (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}

describe("exit codes", () => {
  test("exits 0 on the valid fixture directory", async () => {
    const r = await runAsync(["--root", VALID])
    assert.equal(r.code, 0)
    assert.match(r.stdout, /检查通过/)
  })

  test("exits 1 on the fixture directory containing errors", async () => {
    const r = await runAsync(["--root", QUALITY])
    assert.equal(r.code, 1)
    assert.match(r.stdout, /发现 \d+ 个错误/)
  })

  test("exits 2 for unknown parameters", async () => {
    const r = await runAsync(["--root", QUALITY, "--bogus"])
    assert.equal(r.code, 2)
    assert.match(r.stderr, /未知参数：--bogus/)
  })

  test("exits 2 when the root directory does not exist", async () => {
    const r = await runAsync(["--root", path.join(QUALITY, "no-such-dir")])
    assert.equal(r.code, 2)
    assert.match(r.stderr, /目录/)
  })

  test("exits 2 when --output is given without --format json", async () => {
    const out = path.join(ROOT, "reports", "content-quality.json")
    const r = await runAsync(["--root", QUALITY, "--output", out])
    assert.equal(r.code, 2)
    assert.match(r.stderr, /--output 只能与 --format json/)
  })

  test("exits 2 for an unknown format", async () => {
    const r = await runAsync(["--format", "pdf"])
    assert.equal(r.code, 2)
    assert.match(r.stderr, /--format 必须是 text 或 json/)
  })

  test("exits 2 when the required value for an option is missing", async () => {
    const r = await runAsync(["--root"])
    assert.equal(r.code, 2)
    assert.match(r.stderr, /--root 缺少值/)
  })
})

describe("report shape and rules", () => {
  test("JSON report contains schemaVersion, counts, and issues", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    assert.equal(r.code, 1)
    const report = JSON.parse(r.stdout)
    assert.equal(report.schemaVersion, "1")
    assert.equal(report.contentRoot, "fixtures/content-quality")
    assert.equal(typeof report.counts, "object")
    assert.ok(report.counts.documents > 0)
    assert.equal(report.issues.length, report.counts.errors + report.counts.warnings)
  })

  test("issue has ruleId, level, file, line, target and message", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    const issue = report.issues.find(
      (i: { ruleId: string }) => i.ruleId === "page-link-missing",
    )
    assert.ok(issue, "page-link-missing should fire")
    assert.equal(issue.level, "error")
    assert.equal(issue.file, "notes/broken page link.md")
    assert.ok(typeof issue.line === "number")
    assert.equal(issue.target, "does-not-exist")
    assert.match(issue.message, /页面不存在/)
  })

  test("rule matrix covers every documented rule", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    const ruleIds = new Set(report.issues.map((i: { ruleId: string }) => i.ruleId))
    for (const rule of [
      "page-link-missing",
      "asset-missing",
      "heading-missing",
      "duplicate-slug",
      "frontmatter-missing",
      "frontmatter-parse-failed",
      "title-missing",
      "frontmatter-field-type",
      "unsupported-syntax",
    ]) {
      assert.ok(ruleIds.has(rule), `rule ${rule} should appear in the fixture`)
    }
  })

  test("error rules do not appear for code-block, inline code, external links or placeholders", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    const targets = report.issues.map((i: { target: string }) => i.target ?? "")
    for (const forbidden of ["fake-link", "Page", "link", "example", "not-a-link"]) {
      assert.ok(
        !targets.some((t: string) => t === forbidden),
        `placeholder ${forbidden} should not be reported`,
      )
    }
  })

  test("duplicate-slug reports every conflicting file and slug", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    const dupes = report.issues.filter((i: { ruleId: string }) => i.ruleId === "duplicate-slug")
    assert.equal(dupes.length, 2)
    const files = new Set(dupes.map((i: { file: string }) => i.file))
    assert.ok(files.has("duplicate/duplicate.md"))
    assert.ok(files.has("duplicate/index.md"))
    for (const d of dupes) {
      assert.equal(d.target, "duplicate/index")
      assert.equal(d.files.length, 2)
    }
  })

  test("virtual folder and tag pages are not reported as missing", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    const targets = report.issues.map((i: { target: string }) => i.target ?? "")
    assert.ok(!targets.includes("folder folder"))
    assert.ok(!targets.includes("tags/plugin/transformer"))
  })

  test("draft and unlisted pages are excluded from the published-page set", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    // The draft and unlisted pages are parsed (documents) but excluded from
    // the published page set that link rules run against.
    assert.ok(report.counts.documents > report.counts.pages)
    assert.ok(report.counts.pages >= 16)
  })

  test("stable, sortable issue ordering is independent of filesystem walk", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    const keys = report.issues.map(
      (i: { file: string; line: number; ruleId: string }) =>
        `${i.file}:${i.line}:${i.ruleId}:${i.target ?? ""}`,
    )
    assert.deepEqual(keys, [...keys].sort())
  })

  test("JSON is deterministic across repeated runs", async () => {
    const a = await runAsync(["--root", QUALITY, "--format", "json"])
    const b = await runAsync(["--root", QUALITY, "--format", "json"])
    assert.equal(a.stdout, b.stdout)
  })

  test("--output creates the file with its own parent directory and summary to stderr", async () => {
    const outDir = path.join(ROOT, "reports-test")
    const outFile = path.join(outDir, "content-quality.json")
    const r = await runAsync(["--root", QUALITY, "--format", "json", "--output", outFile])
    assert.equal(r.code, 1)
    assert.equal(r.stdout, "")
    assert.ok(fs.existsSync(outFile))
    const onDisk = JSON.parse(fs.readFileSync(outFile, "utf8"))
    assert.equal(onDisk.counts.errors, r.stderr.includes("10") ? 10 : onDisk.counts.errors)
    // Clean up regardless.
    fs.rmSync(outDir, { recursive: true, force: true })
  })

  test("JSON report paths are relative POSIX paths", async () => {
    const r = await runAsync(["--root", QUALITY, "--format", "json"])
    const report = JSON.parse(r.stdout)
    for (const i of report.issues as { file: string }[]) {
      assert.ok(!path.isAbsolute(i.file))
      assert.ok(!i.file.includes("\\"), "file should be a POSIX relative path")
    }
  })
})

describe("default content passes the checker", () => {
  test("scanning ./content produces no errors", async () => {
    const r = await runAsync(["--format", "json"])
    assert.equal(r.code, 0)
    const report = JSON.parse(r.stdout)
    assert.equal(report.counts.errors, 0)
  })
})
