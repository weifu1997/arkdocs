import { ProcessedContent } from "../plugins/vfile"
import { FullSlug } from "./path"

/**
 * A slug collision: two or more source files that produce the same FullSlug
 * after slugifyFilePath. The `winner` is the file whose HTML output and trie
 * data represent this slug in the final build (see fileTrie.ts and the
 * emitter's last-write-wins semantics in plugins/emitters/helpers.ts).
 *
 * `files` is in the order the files appear in the parsed content array
 * (glob order), which is deterministic. `winner` is always the last entry.
 */
export interface SlugCollision {
  slug: FullSlug
  files: Array<{ relativePath: string; filePath: string }>
  winner: { relativePath: string; filePath: string }
}

export function detectSlugCollisions(content: ProcessedContent[]): SlugCollision[] {
  const bySlug = new Map<FullSlug, Array<{ relativePath: string; filePath: string }>>()

  for (const [, file] of content) {
    const slug = file.data.slug
    if (!slug) continue
    const entry = {
      relativePath: (file.data.relativePath ?? "") as string,
      filePath: (file.data.filePath ?? "") as string,
    }
    const existing = bySlug.get(slug)
    if (existing) {
      existing.push(entry)
    } else {
      bySlug.set(slug, [entry])
    }
  }

  const collisions: SlugCollision[] = []
  for (const [slug, files] of bySlug) {
    if (files.length < 2) continue
    collisions.push({
      slug,
      files,
      winner: files[files.length - 1]!,
    })
  }

  return collisions
}

/**
 * Format a list of collisions as a single human-readable warning block.
 * Returns an empty string when there are no collisions so callers can
 * unconditionally log the result.
 */
export function formatCollisionWarning(collisions: SlugCollision[]): string {
  if (collisions.length === 0) return ""

  const lines: string[] = []
  const header =
    collisions.length === 1
      ? `警告：检测到 1 处 slug 冲突。`
      : `警告：检测到 ${collisions.length} 处 slug 冲突。`
  lines.push(header)
  lines.push(
    `多个源文件生成了相同的 URL slug。后处理的文件会覆盖先处理的文件，被覆盖的内容不会出现在输出中。`,
  )
  lines.push("")

  for (const collision of collisions) {
    lines.push(`  slug \`${collision.slug}\``)
    for (const file of collision.files) {
      const marker = file === collision.winner ? "（用于此 URL）" : "（被覆盖）"
      const path = file.relativePath || file.filePath || "（未知来源）"
      lines.push(`    - ${path} ${marker}`)
    }
    lines.push("")
  }

  lines.push(
    `要解决冲突，请为每个冲突的 slug 只保留一个文件，其余文件请重命名或删除。这可能包括使用 Obsidian「文件夹笔记」约定（\`folder/folder.md\`）且与已有 \`folder/index.md\` 冲突的文件。`,
  )

  return lines.join("\n")
}
