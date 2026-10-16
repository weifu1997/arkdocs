#!/usr/bin/env node
/**
 * Local content quality check for the ArkDocs knowledge base.
 *
 * Usage:
 *   npm run check:content                                  # scan ./content
 *   npm run check:content -- --root <content-dir>
 *   npm run check:content -- --root <content-dir> --format json
 *   npm run check:content -- --root <content-dir> --format json \
 *                           --output reports/content-quality.json
 *
 * Exit codes:
 *   0  no errors (warnings allowed)
 *   1  at least one error rule fired
 *   2  usage error: unknown parameters, missing required values, or an
 *      unusable content directory
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { scan } from "./lib/scan.mjs"

const SCHEMA_VERSION = "1"

const HELP = `内容质量检查

用法：
  node scripts/check-content.mjs [--root <目录>] [--format text|json] [--output <文件>] [--ignore <模式>]

选项：
  --root, -d <目录>     要检查的内容目录（默认：./content）
  --format <格式>       text（终端摘要，默认）或 json
  --output <文件>       将 JSON 报告写入文件；目录不存在时自动创建
                       （必须与 --format json 同时使用）
  --ignore <模式>       可重复，glob 模式的额外忽略规则
  --help, -h            显示帮助
  --version             显示版本号`

function exitUsage(message) {
  process.stderr.write(`${message}\n\n${HELP}\n`)
  process.exit(2)
}

function parseArgs(argv) {
  const opts = { root: null, format: null, output: null, ignore: [] }
  const flags = new Set(["--root", "-d", "--format", "--output", "--ignore", "--version"])
  let positional = 0

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${HELP}\n`)
      process.exit(0)
    }
    if (arg === "--version") {
      process.stdout.write(`${SCHEMA_VERSION}\n`)
      process.exit(0)
    }
    if (!flags.has(arg)) {
      if (arg.startsWith("-")) exitUsage(`未知参数：${arg}`)
      // Legacy single positional directory.
      positional += 1
      if (positional > 1) exitUsage("只能指定一个内容目录")
      opts.root = arg
      continue
    }
    const key = arg
    const value = argv[i + 1]
    if (value === undefined || flags.has(value)) {
      exitUsage(`参数 ${arg} 缺少值`)
    }
    i += 1
    switch (key) {
      case "--root":
      case "-d":
        opts.root = value
        break
      case "--format":
        if (value !== "text" && value !== "json") {
          exitUsage(`--format 必须是 text 或 json，收到：${value}`)
        }
        opts.format = value
        break
      case "--output":
        opts.output = value
        break
      case "--ignore":
        opts.ignore.push(value)
        break
    }
  }

  if (!opts.root) {
    const defaultDir = path.join(process.cwd(), "content")
    if (!fs.existsSync(defaultDir)) {
      exitUsage("未找到默认内容目录 ./content，请使用 --root 指定")
    }
    opts.root = defaultDir
  } else {
    opts.root = path.resolve(opts.root)
  }

  if (opts.output && opts.format !== "json") {
    exitUsage("--output 只能与 --format json 同时使用")
  }
  return opts
}

function loadIgnorePatterns(rootDir) {
  const patterns = []
  const configPath = path.join(process.cwd(), "quartz.config.yaml")
  if (!fs.existsSync(configPath)) return patterns
  try {
    const raw = fs.readFileSync(configPath, "utf8")
    const match = /^ignorePatterns:\s*\n([\s\S]*?)(?=^\S|$)/m.exec(raw)
    if (!match) return patterns
    for (const line of match[1].split("\n")) {
      const entry = line.match(/^\s*-\s*(.+?)\s*$/)
      if (entry) patterns.push(entry[1])
    }
  } catch {
    // Config parsing is best-effort; missing ignore patterns must not break checks.
  }
  return patterns
}

function buildReport(scanResult, rootDir) {
  const relativeRoot = path.relative(process.cwd(), rootDir).replaceAll(path.sep, "/")
  const { stats } = scanResult
  return {
    schemaVersion: SCHEMA_VERSION,
    contentRoot: relativeRoot || ".",
    counts: {
      documents: stats.documents,
      pages: stats.pages,
      assets: stats.assets,
      links: stats.links,
      errors: stats.errors,
      warnings: stats.warnings,
    },
    issues: scanResult.issues,
  }
}

function renderSummary(report, scanResult) {
  const { counts } = report
  const lines = [
    `扫描目录：${report.contentRoot}`,
    `文档 ${counts.documents} 篇，页面 ${counts.pages} 个，资源引用 ${counts.assets} 处，链接引用 ${counts.links} 处`,
  ]
  for (const issue of scanResult.issues) {
    const where = issue.line ? `:${issue.line}` : ""
    const target = issue.target ? `（目标：${issue.target}）` : ""
    lines.push(
      `${issue.level === "error" ? "错误" : "警告"} [${issue.ruleId}] ${issue.file}${where}${target} ${issue.message}`,
    )
    if (Array.isArray(issue.files)) {
      for (const conflict of issue.files) {
        if (conflict.file !== issue.file) {
          lines.push(`  └─ ${conflict.file}:${conflict.line}（冲突文件）`)
        }
      }
    }
  }
  if (counts.errors > 0) {
    lines.push(`发现 ${counts.errors} 个错误，${counts.warnings} 个警告`)
  } else if (counts.warnings > 0) {
    lines.push(`检查通过：${counts.warnings} 个警告（不阻断发布）`)
  } else {
    lines.push("检查通过：未发现问题")
  }
  return lines.join("\n")
}

function main() {
  const argv = process.argv.slice(2)
  const opts = parseArgs(argv)

  let result
  try {
    result = scan(opts.root, [...loadIgnorePatterns(opts.root), ...opts.ignore])
  } catch (err) {
    exitUsage(err instanceof Error ? err.message : String(err))
  }

  const report = buildReport(result, opts.root)
  const summary = renderSummary(report, result)

  if (opts.format === "json" || opts.output) {
    if (opts.output) {
      const outputPath = path.resolve(opts.output)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8")
      process.stderr.write(
        `${summary}\n报告已写入：${path.relative(process.cwd(), outputPath).replaceAll(path.sep, "/")}\n`,
      )
    } else {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n")
    }
    process.exit(result.stats.errors > 0 ? 1 : 0)
  }

  process.stdout.write(`${summary}\n`)
  process.exit(result.stats.errors > 0 ? 1 : 0)
}

main()
