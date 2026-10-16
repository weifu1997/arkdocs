/**
 * ArkDocs 作者本地内容质量检查 CLI。
 *
 * 用法：
 *   npm run check:content                                   # 扫描仓库 content/，输出中文摘要
 *   npm run check:content -- --root <dir>                   # 扫描独立目录
 *   npm run check:content -- --format json                  # JSON 写到 stdout
 *   npm run check:content -- --format json --output reports/report.json
 *
 * 退出码：0 无 error（可只有 warning）；1 存在 error；2 参数错误。
 */

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { runContentCheck } from "./contentCheck.mjs"

const SCHEMA_VERSION = 1

function parseArgs(argv) {
  const options = { root: "content", format: "text", output: null, outputFlagSeen: false }
  const positionals = []
  let sawHelp = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--help" || arg === "-h") {
      sawHelp = true
      continue
    }
    if (arg === "--root") {
      const next = argv[++i]
      if (next === undefined || next === null || next.startsWith("--")) {
        fatal("错误：--root 缺少参数值")
      }
      options.root = next
      continue
    }
    if (arg.startsWith("--root=")) {
      options.root = arg.slice("--root=".length)
      continue
    }
    if (arg === "--format") {
      const next = argv[++i]
      if (next === undefined || next === null || next.startsWith("--")) {
        fatal("错误：--format 缺少参数值")
      }
      options.format = next
      continue
    }
    if (arg.startsWith("--format=")) {
      options.format = arg.slice("--format=".length)
      continue
    }
    if (arg === "--output") {
      options.outputFlagSeen = true
      const next = argv[++i]
      if (next !== undefined && next !== null && !next.startsWith("--")) {
        options.output = next
        i++
      }
      continue
    }
    if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length)
      continue
    }
    positionals.push(arg)
  }
  return { options, positionals, sawHelp }
}

function fatal(message) {
  process.stderr.write(`${message}\n`)
  process.exit(2)
}

function main() {
  const { options, positionals, sawHelp } = parseArgs(process.argv.slice(2))

  if (sawHelp) {
    process.stdout.write(
      `用法：npm run check:content [--root <dir>] [--format text|json] [--output <file>]\n` +
        `退出码：0 成功；1 存在 error；2 参数错误\n`,
    )
    process.exit(0)
  }
  if (positionals.length > 0) {
    fatal(`错误：不支持的位置参数：${positionals.join(" ")}`)
  }
  if (options.format !== "text" && options.format !== "json") {
    fatal(`错误：--format 必须是 text 或 json，收到：${options.format}`)
  }
  if (options.output && options.format !== "json") {
    fatal(`错误：--output 仅在 --format json 时可用（未指定 --format json）`)
  }
  if (options.root === "" || options.root === undefined) {
    fatal("错误：--root 缺少参数值")
  }
  if (options.outputFlagSeen && options.output === null) {
    fatal("错误：--output 缺少参数值")
  }

  const root = path.resolve(process.cwd(), options.root)
  if (!fs.existsSync(root)) {
    fatal(`错误：扫描根目录不存在：${options.root}（解析为 ${root}）`)
  }
  if (!fs.statSync(root).isDirectory()) {
    fatal(`错误：扫描根目录不是目录：${root}`)
  }

  const result = runContentCheck({ root, ignorePatterns: [] })

  const errors = result.stats.errors
  const warnings = result.stats.warnings

  const report = {
    schemaVersion: SCHEMA_VERSION,
    scanRoot: result.scanRoot,
    stats: {
      ...result.stats,
    },
    summary: { errors, warnings },
    issues: result.issues,
  }

  if (options.format === "json") {
    const json = JSON.stringify(report, null, 2)
    if (options.output) {
      const outputPath = path.resolve(process.cwd(), options.output)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, json + "\n", "utf8")
      process.stderr.write(
        `JSON 报告已写入 ${options.output}：${errors} 个错误，${warnings} 个警告\n`,
      )
    } else {
      process.stdout.write(json + "\n")
    }
  } else {
    process.stderr.write(
      `检查扫描根目录：${options.root}\n` + `发现 ${errors} 个错误，${warnings} 个警告\n`,
    )
    for (const issue of result.issues) {
      const where = issue.line ? `${issue.file}:${issue.line}` : issue.file
      const target = issue.target ? ` -> ${issue.target}` : ""
      process.stderr.write(`  [${issue.ruleId}] ${where}${target}\n`)
    }
  }

  process.exit(errors > 0 ? 1 : 0)
}

main()
