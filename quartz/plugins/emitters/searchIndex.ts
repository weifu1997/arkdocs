import { FullSlug, joinSegments } from "../../util/path"
import { write } from "./helpers"
import { QuartzEmitterPlugin } from "../types"
import { ProcessedContent } from "../vfile"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"
import { buildSearchIndex } from "../search/searchData"

/**
 * Writes `static/searchIndex.json`: a flat, build-time snapshot of every
 * *published* page used by the public `/search` page. The browser fetches
 * this file instead of re-parsing Markdown, and the set is identical to the
 * published boundary of `contentIndex.json` (drafts removed by filters,
 * unlisted pages skipped, 404 excluded).
 */
export const SearchIndex: QuartzEmitterPlugin = () => {
  const emitAll = async (ctx: BuildCtx, content: ProcessedContent[]) => {
    const index = buildSearchIndex(content)
    return [
      await write({
        ctx,
        content: JSON.stringify(index),
        slug: joinSegments("static", "searchIndex") as FullSlug,
        ext: ".json",
      }),
    ]
  }

  return {
    name: "SearchIndex",
    emit: (ctx, content, _resources: StaticResources) => emitAll(ctx, content),
    partialEmit: (ctx, content, _resources: StaticResources) => emitAll(ctx, content),
  }
}
