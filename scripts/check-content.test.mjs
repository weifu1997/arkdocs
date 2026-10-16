#!/usr/bin/env node
/**
 * Offline tests for the content quality checker.
 * Runs the CLI as a child process against the fixtures and asserts exit
 * codes, JSON report contents, and deterministic output.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..")
const checker = path.join(repoRoot, "scripts", "check-content.mjs")

async function run(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [checker, ...args],
      { cwd: repoRoot, ...options },
      (error, stdout, stderr) => {
        if (error) {
          reject({
            code: error.code,
            stdout: stdout ?? "",
            stderr: stderr ?? "",
          })
        } else {
          resolve({ code: 0, stdout, stderr })
        }
      },
    )
  })
}

async function runExpect(args, code, options = {}) {
  try {
    const result = await run(args, options)
    assert.fail(`expected exit code ${code}, got ${result.code}`)
  } catch (error) {
    assert.ok(error.code === code, `expected exit code ${code}, got ${error.code}`)
    return error
  }
}

test("default scan of content/ passes with no issues", async () => {
  const { stdout, code } = await run([])
  assert.strictEqual(code, 0)
  assert.match(stdout, /问题：0 个 error，0 个 warning/)
})

test("quality fixture exits 1 with expected error rule ids", async () => {
  const error = await runExpect(["--root", "fixtures/content-quality"], 1)
  // Rule ids are verified via the JSON report; the text summary must show
  // the same error count.
  const jsonError = await runExpect(["--root", "fixtures/content-quality", "--format", "json"], 1)
  const report = JSON.parse(jsonError.stdout)
  const ruleIds = [
    "page-link-missing",
    "asset-missing",
    "heading-missing",
    "duplicate-slug",
    "frontmatter-missing",
    "frontmatter-parse-failed",
    "title-missing",
  ]
  const reportRules = new Set(report.issues.map((issue) => issue.ruleId))
  for (const ruleId of ruleIds) assert.ok(reportRules.has(ruleId), `missing rule ${ruleId}`)
  assert.ok(reportRules.has("frontmatter-field-type"))
  assert.match(error.stdout, /问题：7 个 error，2 个 warning/)
})

test("JSON report parses and contains the same issues and stats", async () => {
  const error = await runExpect(["--root", "fixtures/content-quality", "--format", "json"], 1)
  const report = JSON.parse(error.stdout)
  assert.strictEqual(report.schemaVersion, 1)
  assert.strictEqual(report.stats.errors, 7)
  assert.strictEqual(report.stats.warnings, 2)
  assert.ok(report.issues.length >= 9)
  const byRule = {}
  for (const issue of report.issues) byRule[issue.ruleId] = (byRule[issue.ruleId] ?? 0) + 1
  assert.ok(byRule["frontmatter-field-type"] >= 2)
})

test("JSON output to stdout stays machine-readable with summary on stderr", async () => {
  const error = await runExpect(["--root", "fixtures/content-quality", "--format", "json"], 1)
  const report = JSON.parse(error.stdout)
  assert.ok(report.issues.every((issue) => issue.level === "error" || issue.level === "warning"))
  assert.match(error.stderr, /问题：7 个 error，2 个 warning/)
})

test("JSON report is deterministic across repeated runs", async () => {
  const first = await runExpect(["--root", "fixtures/content-quality", "--format", "json"], 1)
  const second = await runExpect(["--root", "fixtures/content-quality", "--format", "json"], 1)
  assert.strictEqual(first.stdout, second.stdout)
})

test("--output writes the same JSON and summary to stderr", async () => {
  const outputPath = "reports/content-quality.test.json"
  const error = await runExpect(
    ["--root", "fixtures/content-quality", "--format", "json", "--output", outputPath],
    1,
  )
  const file = fs.readFileSync(path.join(repoRoot, outputPath), "utf8")
  const fromFile = JSON.parse(file)
  assert.strictEqual(fromFile.issues.length, 9)
  assert.match(error.stderr, /问题：7 个 error，2 个 warning/)
  fs.unlinkSync(path.join(repoRoot, outputPath))
  fs.rmdirSync(path.join(repoRoot, "reports"), { recursive: true, force: true })
})

test("valid fixture exits 0", async () => {
  const { code, stdout } = await run(["--root", "fixtures/content-quality-valid"])
  assert.strictEqual(code, 0)
  assert.match(stdout, /0 个 error，0 个 warning/)
})

test("CLI validation exits 2 for bad arguments", async () => {
  const cases = [
    ["--root", "fixtures/does-not-exist"],
    ["--bogus"],
    ["--format", "yaml"],
    ["--output", "x.json"],
    ["--root"],
  ]
  for (const args of cases) {
    const error = await runExpect(args, 2)
    assert.ok(error.stderr.length > 0)
  }
})

test("warning-only fixture leaves exit 0", async () => {
  const tempDir = path.join(repoRoot, "fixtures", ".tmp-warning")
  fs.mkdirSync(tempDir, { recursive: true })
  fs.writeFileSync(
    path.join(tempDir, "warning-page.md"),
    "---\ntitle: 警告页\ntags: component\ndraft: maybe\n---\n\n正文。\n",
  )
  try {
    const { code, stdout } = await run(["--root", "fixtures/.tmp-warning"])
    assert.strictEqual(code, 0)
    assert.match(stdout, /2 个 warning/)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
