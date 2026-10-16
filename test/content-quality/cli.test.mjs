/**
 * 作者本地断链检查 CLI（`scripts/check-content.mjs`）端到端测试。
 *
 * 通过真实子进程运行 CLI，验证退出码、JSON 可解析性、规则 ID、相对源文件、
 * 行号、目标、以及双次运行 JSON 内容一致。
 */

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import assert from "node:assert/strict"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "../..")
const CLI = path.join(REPO_ROOT, "scripts", "check-content.mjs")

function runCli(args, opts = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    ...opts,
  })
  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

test("bad fixture exits 1 with expected rule IDs and 1-based source file/line", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  assert.equal(r.exitCode, 1)
  const report = JSON.parse(r.stdout)
  assert.equal(report.schemaVersion, 1)
  const rules = report.issues.map((i) => i.ruleId).sort()
  // Must be present: page-link-missing, asset-missing, heading-missing
  // (heading is covered by broken-links -> good-page anchor), duplicate-slug,
  // frontmatter-missing, frontmatter-parse-failed, title-missing.
  assert.ok(rules.includes("page-link-missing"))
  assert.ok(rules.includes("asset-missing"))
  assert.ok(rules.includes("duplicate-slug"))
  assert.ok(rules.includes("frontmatter-missing"))
  assert.ok(rules.includes("frontmatter-parse-failed"))
  assert.ok(rules.includes("title-missing"))

  // Every issue has a POSIX relative file (no absolute path, no drive letter).
  for (const issue of report.issues) {
    assert.ok(issue.file && !path.isAbsolute(issue.file), `relative file: ${issue.file}`)
    assert.ok(typeof issue.line === "number", `line is 1-based number: ${issue.line}`)
    assert.ok(issue.line >= 1, `line >= 1: ${issue.line}`)
    assert.ok(issue.ruleId && issue.level && issue.message)
  }
})

test("page-link-missing reports source file and line", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const link = report.issues.find(
    (i) => i.ruleId === "page-link-missing" && i.target === "does-not-exist",
  )
  assert.ok(link)
  assert.equal(link.file, "bad/broken-links.md")
  assert.ok(link.line >= 7)
})

test("asset-missing reports source file and line", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const asset = report.issues.find(
    (i) => i.ruleId === "asset-missing" && i.target === "images/missing.png",
  )
  assert.ok(asset)
  assert.equal(asset.file, "bad/broken-assets.md")
  assert.ok(asset.line >= 5)
})

test("duplicate-slug includes all conflicting files and the slug in line position", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const dupes = report.issues.filter((i) => i.ruleId === "duplicate-slug")
  assert.equal(dupes.length, 2)
  const files = dupes.map((i) => i.file).sort()
  assert.deepEqual(files, ["bad/duplicate.md", "bad/duplicate/index.md"])
  for (const d of dupes) assert.ok(d.line >= 1)
  assert.ok(/duplicate/.test(dupes[0].message))
})

test("heading-missing points at the source file and line", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const heading = report.issues.find(
    (i) => i.ruleId === "heading-missing" && i.target === "good-page#不存在的小节",
  )
  assert.ok(heading)
  assert.equal(heading.file, "bad/broken-links.md")
})

test("no-frontmatter produces frontmatter-missing", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const m = report.issues.find(
    (i) => i.ruleId === "frontmatter-missing" && i.file === "bad/no-frontmatter.md",
  )
  assert.ok(m)
})

test("bad YAML produces frontmatter-parse-failed", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const m = report.issues.find((i) => i.ruleId === "frontmatter-parse-failed")
  assert.ok(m)
})

test("missing title produces title-missing", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  const m = report.issues.find((i) => i.ruleId === "title-missing")
  assert.ok(m)
})

test("valid fixture exits 0 with empty issues", () => {
  const r = runCli(["--root", "fixtures/content-quality-valid", "--format", "json"])
  assert.equal(r.exitCode, 0)
  const report = JSON.parse(r.stdout)
  assert.equal(report.issues.length, 0)
  assert.equal(report.summary.errors, 0)
  assert.equal(report.summary.warnings, 0)
})

test("warnings-only fixture exits 0 with warnings", () => {
  const r = runCli(["--root", "fixtures/content-quality-warnings", "--format", "json"])
  assert.equal(r.exitCode, 0)
  const report = JSON.parse(r.stdout)
  assert.equal(report.summary.errors, 0)
  assert.ok(report.summary.warnings > 0)
  const warnings = report.issues.map((i) => i.ruleId)
  assert.ok(warnings.includes("frontmatter-field-type"))
  assert.ok(warnings.includes("unsupported-syntax"))
})

test("two consecutive runs produce byte-identical JSON", () => {
  const a = runCli(["--root", "fixtures/content-quality", "--format", "json"]).stdout
  const b = runCli(["--root", "fixtures/content-quality", "--format", "json"]).stdout
  assert.equal(a, b)
})

test("--format json writes JSON to stdout and not to stderr", () => {
  const r = runCli(["--root", "fixtures/content-quality", "--format", "json"])
  const report = JSON.parse(r.stdout)
  assert.ok(report.issues.length > 0)
  // With --format json (no --output) the JSON goes to stdout; stderr carries the
  // human summary and must not contain parseable JSON.
  assert.equal(r.stderr.trim(), "")
})

test("--output writes the same JSON to a file and leaves stdout empty", () => {
  const outPath = path.join(REPO_ROOT, "test", ".cli-report-tmp.json")
  fs.rmSync(outPath, { force: true })
  const r = runCli([
    "--root",
    "fixtures/content-quality",
    "--format",
    "json",
    "--output",
    "test/.cli-report-tmp.json",
  ])
  assert.equal(r.exitCode, 1)
  const onDisk = JSON.parse(fs.readFileSync(outPath, "utf8"))
  assert.ok(onDisk.issues.length > 0)
  // stdout is empty when --output is provided; summary goes to stderr.
  assert.equal(r.stdout.trim(), "")
  assert.ok(r.stderr.includes("JSON 报告已写入"))
  fs.rmSync(outPath, { force: true })
})

test("--without --format json text output summary on stderr", () => {
  const r = runCli(["--root", "fixtures/content-quality"])
  assert.equal(r.exitCode, 1)
  assert.ok(r.stderr.includes("错误"))
})

test("argument errors exit 2: missing value, unknown flag, bad format, output without json", () => {
  assert.equal(runCli(["--root", "fixtures/content-quality", "--output"]).exitCode, 2)
  assert.equal(runCli(["--root", "fixtures/content-quality", "--format"]).exitCode, 2)
  assert.equal(runCli(["--root", "fixtures/content-quality", "--format", "xml"]).exitCode, 2)
  assert.equal(runCli(["--root", "fixtures/content-quality", "--output", "x.json"]).exitCode, 2)
  assert.equal(runCli(["--bogus"]).exitCode, 2)
})

test("missing root directory exits 2", () => {
  const r = runCli(["--root", "definitely-not-a-real-directory"])
  assert.equal(r.exitCode, 2)
})
