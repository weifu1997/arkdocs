/**
 * Builtin plugin for the public `/search` feature.
 *
 * It ships two parts, both driven by the *post-filtered* content so that
 * drafts (removed by `remove-draft`) and pages matching `ignorePatterns`
 * (globbed out before parsing) never reach this plugin, and unlisted pages are
 * explicitly skipped:
 *
 *  - `PublicSearchIndex` (emitter): writes `static/publicSearchIndex.json`, a
 *    small index with slug, title, description, folder, searchable body text,
 *    tags, and source file path. Virtual pages (folder/tag/bases pages) are
 *    intentionally excluded because they are not searchable published content.
 *
 *  - `PublicSearchPageType` (page type): emits the `/search` route using the
 *    shared body component registered in `PublicSearch.tsx`. Its `match` is
 *    `none` so it never consumes a real page; it is generated explicitly.
 */

import { QuartzEmitterPluginInstance, QuartzPageTypePluginInstance } from "../types"
import { FullSlug, joinSegments } from "../../util/path"
import { write } from "../emitters/helpers"
import { ProcessedContent } from "../vfile"
import { toPublicEntry } from "./PublicSearch"
import PublicSearchComponent from "./PublicSearch"
import type { PublicSearchIndex } from "./types"

const INDEX_SLUG = joinSegments("static", "publicSearchIndex") as FullSlug

function buildIndex(content: ProcessedContent[]): PublicSearchIndex {
  const index: PublicSearchIndex = {}
  for (const [, file] of content) {
    const data = file.data
    // Unlisted pages must never be exposed by the public index. Drafts and
    // private/ignored pages are already filtered upstream; this explicit check
    // mirrors the fixed publish rule: data.unlisted === true.
    if (data.unlisted === true) continue
    // Virtual pages (synthesized folder/tag/bases pages, and this /search page
    // itself) are not real searchable documents — exclude them so the public
    // index only contains genuine published markdown.
    if ((data as { virtual?: boolean }).virtual === true) continue
    const slug = data.slug
    if (!slug) continue
    if (!data.relativePath) continue

    index[slug] = toPublicEntry(slug, {
      title: (data.frontmatter?.title as string | undefined) ?? "",
      description: (data.description as string | undefined) ?? "",
      text: (data.text as string | undefined) ?? "",
      tags: data.frontmatter?.tags,
      relativePath: data.relativePath,
    })
  }
  return index
}

export function PublicSearchIndex(): QuartzEmitterPluginInstance {
  return {
    name: "PublicSearchIndex",
    async *emit(ctx, content) {
      const index = buildIndex(content)
      yield write({
        ctx,
        content: JSON.stringify(index),
        slug: INDEX_SLUG,
        ext: ".json",
      })
    },
    async *partialEmit(ctx, content) {
      const index = buildIndex(content)
      yield write({
        ctx,
        content: JSON.stringify(index),
        slug: INDEX_SLUG,
        ext: ".json",
      })
    },
  }
}

export function PublicSearchPageType(): QuartzPageTypePluginInstance {
  // The `/search` route is emitted by the dispatcher via the generated virtual
  // page below. The page type matches nothing on regular content (so it never
  // consumes a real page); it exists only to provide the `/search` route and its
  // full-width layout.
  return {
    name: "PublicSearchPageType",
    priority: 20,
    match: () => false,
    generate() {
      // Provide the `/search` virtual page directly. It carries no markdown
      // body; the component renders the UI and loads the index on the client.
      return [
        {
          slug: "search" as FullSlug,
          title: "搜索",
          data: {
            frontmatter: { title: "搜索", tags: [] },
            slug: "search",
            relativePath: "search.md",
            text: "",
          } as never,
        },
      ]
    },
    layout: "search",
    frame: "full-width",
    body: () => PublicSearchComponent(),
  }
}
