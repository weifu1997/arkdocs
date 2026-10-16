#!/usr/bin/env node
/**
 * Build-time helper that emits a fixture Content Index in the exact shape of
 * the real static/contentIndex.json. Used by offline tests only; it never
 * touches the real content/ directory.
 *
 * Published boundary (matches quartz.config.yaml):
 *   - draft: true             -> draft
 *   - unlisted: true          -> unlisted
 *   - ignored (private/...)   -> private
 *   - everything else         -> published
 */
import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"
import { fileURLToPath } from "node:url"

export const FIXTURE_DIR = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
  "fixtures",
  "content-discovery",
)
export const IGNORE_PATTERNS = ["private"]

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name)
      return entry.isDirectory() ? walk(fullPath) : [fullPath]
    })
}

function slugify(relPath) {
  return relPath
    .split(path.sep)
    .join("/")
    .replace(/\.(md|markdown)$/i, "")
    .split("/")
    .map((segment) => segment.replace(/index$/i, "index").replace(/\s/g, "-").toLowerCase())
    .join("/")
    .replace(/\/index$/, "")
}

function parseDocument(filePath) {
  const raw = fs.readFileSync(filePath, "utf8")
  if (!raw.startsWith("---\n")) {
    return { frontmatter: {}, body: raw }
  }
  const end = raw.indexOf("\n---", 4)
  const fm = YAML.parse(raw.slice(4, end)) ?? {}
  return { frontmatter: fm, body: raw.slice(end + 4) }
}

function isIgnored(relPath) {
  const posix = relPath.split(path.sep).join("/")
  return IGNORE_PATTERNS.some(
    (pattern) => posix === pattern || posix.startsWith(`${pattern}/`),
  )
}

export function buildFixtureIndex() {
  const files = walk(FIXTURE_DIR).filter((file) => /\.(md|markdown)$/i.test(file))
  const index = {}
  for (const file of files) {
    const relPath = path.relative(FIXTURE_DIR, file).split(path.sep).join("/")
    const { frontmatter, body } = parseDocument(file)
    const slug = slugify(relPath)
    if (frontmatter.draft === true) continue
    if (frontmatter.unlisted === true) continue
    if (isIgnored(relPath)) continue
    index[slug] = {
      slug,
      filePath: relPath,
      title: frontmatter.title ?? "",
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      content: body,
      description: frontmatter.description ?? "",
    }
  }
  return index
}

// When run directly, print the index JSON.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify(buildFixtureIndex(), null, 2))
}
