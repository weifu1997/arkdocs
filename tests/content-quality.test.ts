import test, { describe } from "node:test"
import assert from "node:assert"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const REPO_ROOT = path.resolve(import.meta.dirname, "..")

function runCLI(args: string[]): { stdout: string; stderr: string; code: number } {
  const out = execSync(
    `node scripts/check-content.mjs ${args.map((a) => `"${a}"`).join(" ")} 2>/dev/null || true`,
    { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 1024 * 1024 * 10 }
  )
  return { stdout: out, stderr: "", code: 0 }
}

describe("content-quality CLI", () => {
  test("fixture produces expected errors", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "json"])
    const report = JSON.parse(stdout)
    assert.equal(report.schemaVersion, "1.0.0")
    assert.ok(report.stats.errors > 0)
    assert.ok(report.issues.length > 0)
    const ruleIds = report.issues.map((i: any) => i.ruleId)
    assert.ok(ruleIds.includes("page-link-missing"))
    assert.ok(ruleIds.includes("asset-missing"))
    assert.ok(ruleIds.includes("heading-missing"))
    assert.ok(ruleIds.includes("frontmatter-missing"))
  })

  test("valid fixture exits 0", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality-valid", "--format", "json"])
    const report = JSON.parse(stdout)
    assert.equal(report.stats.errors, 0)
    assert.equal(report.stats.warnings, 0)
    assert.equal(report.issues.length, 0)
  })

  test("JSON output is deterministic", () => {
    const a = runCLI(["--root", "fixtures/content-quality", "--format", "json"]).stdout
    const b = runCLI(["--root", "fixtures/content-quality", "--format", "json"]).stdout
    assert.equal(a, b)
  })

  test("output paths are relative", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "json"])
    const report = JSON.parse(stdout)
    for (const issue of report.issues) {
      assert.ok(!issue.source.includes("/"), `source should be relative: ${issue.source}`)
    }
  })

  test("issues have required fields", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "json"])
    const report = JSON.parse(stdout)
    for (const issue of report.issues) {
      assert.ok(issue.ruleId)
      assert.ok(issue.level)
      assert.ok(issue.source)
      assert.ok(issue.message)
    }
  })

  test("exit code 1 on errors", () => {
    try {
      execSync("node scripts/check-content.mjs --root fixtures/content-quality --format json", {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("should have exited 1")
    } catch (e: any) {
      assert.equal(e.status, 1)
    }
  })

  test("exit code 0 on valid fixture", () => {
    try {
      execSync("node scripts/check-content.mjs --root fixtures/content-quality-valid --format json", {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
    } catch (e: any) {
      assert.fail(`should have exited 0, got ${e.status}`)
    }
  })

  test("exit code 2 on unknown arg", () => {
    try {
      execSync("node scripts/check-content.mjs --unknown-arg", {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("should have exited 2")
    } catch (e: any) {
      assert.equal(e.status, 2)
    }
  })

  test("exit code 2 on missing --root value", () => {
    try {
      execSync("node scripts/check-content.mjs --root", {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("should have exited 2")
    } catch (e: any) {
      assert.equal(e.status, 2)
    }
  })

  test("exit code 2 on --output without --format json", () => {
    try {
      execSync("node scripts/check-content.mjs --output reports/test.json", {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("should have exited 2")
    } catch (e: any) {
      assert.equal(e.status, 2)
    }
  })

  test("exit code 2 on nonexistent --root", () => {
    try {
      execSync("node scripts/check-content.mjs --root fixtures/nonexistent", {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "pipe",
      })
      assert.fail("should have exited 2")
    } catch (e: any) {
      assert.equal(e.status, 2)
    }
  })

  test("text format works", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "text"])
    assert.ok(stdout.includes("内容检查失败"))
    assert.ok(stdout.includes("error"))
  })

  test("--output creates parent directories", () => {
    const outPath = "reports/test-content-quality.json"
    fs.rmSync(path.join(REPO_ROOT, "reports"), { recursive: true, force: true })
    runCLI(["--root", "fixtures/content-quality", "--format", "json", "--output", outPath])
    assert.ok(fs.existsSync(path.join(REPO_ROOT, outPath)))
    const report = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, outPath), "utf8"))
    assert.ok(report.issues.length > 0)
    fs.rmSync(path.join(REPO_ROOT, "reports"), { recursive: true, force: true })
  })

  test("duplicate-slug detected", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "json"])
    const report = JSON.parse(stdout)
    const duplicates = report.issues.filter((i: any) => i.ruleId === "duplicate-slug")
    assert.ok(duplicates.length > 0, "should detect duplicate slugs")
  })

  test("draft and unlisted pages not in public index", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "json"])
    const report = JSON.parse(stdout)
    const sources = report.issues.map((i: any) => i.source)
    // Draft and unlisted pages should not be reported as broken
    assert.ok(!sources.includes("draft-page.md"), "draft page should not be checked")
    assert.ok(!sources.includes("unlisted-page.md"), "unlisted page should not be checked")
  })

  test("virtual folder and tag pages not broken", () => {
    const { stdout } = runCLI(["--root", "fixtures/content-quality", "--format", "json"])
    const report = JSON.parse(stdout)
    const sources = report.issues.map((i: any) => i.source)
    assert.ok(!sources.includes("virtual-folder.md"), "virtual folder page should not be broken")
    assert.ok(!sources.includes("virtual-tag.md"), "virtual tag page should not be broken")
  })
})
