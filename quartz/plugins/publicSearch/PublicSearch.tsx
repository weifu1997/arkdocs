/**
 * Public search page body component for `/search`.
 *
 * The interactive UI (query input, tag/folder filters, result list, and the
 * loading / empty / error / initial states) is rendered client-side by
 * `search.inline.ts`, so the precomputed index is only fetched from `/search`.
 * This placeholder is the no-JS / pre-paint shell.
 */

import {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../components/types"
import { normalizeTagValue } from "./slug"

// @ts-expect-error - inline script imported as a string by the esbuild text loader
import inline from "./search.inline"

const FALLBACK_DESCRIPTION = "无摘要"
const FALLBACK_TITLE = "未命名页面"

/** @internal Shared by the index emitter and tests: build a public entry from raw vfile data. */
export function toPublicEntry(
  slug: string,
  data: {
    title?: string
    description?: string
    text?: string
    tags?: unknown
    relativePath?: string
  },
): {
  slug: string
  title: string
  description: string
  folder: string
  content: string
  tags: string[]
  filePath: string
} {
  const title =
    typeof data.title === "string" && data.title.trim() !== "" ? data.title : FALLBACK_TITLE
  const description =
    typeof data.description === "string" && data.description.trim() !== ""
      ? data.description
      : FALLBACK_DESCRIPTION
  const folder = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : ""
  return {
    slug,
    title,
    description,
    folder,
    content: data.text ?? "",
    tags: normalizeTagValue(data.tags),
    filePath: data.relativePath ?? slug,
  }
}

const PublicSearchPage: QuartzComponent = (_props: QuartzComponentProps) => {
  return (
    <div class="public-search" data-public-search>
      <h1 class="public-search-title">搜索</h1>
      <div class="public-search-loading" aria-live="polite">
        正在加载搜索…
      </div>
    </div>
  )
}

PublicSearchPage.afterDOMLoaded = inline
PublicSearchPage.css = `
.public-search {
  max-width: 48rem;
  margin: 0 auto;
  padding: 0 1rem 2rem;
}
.public-search-title {
  margin: 2rem 0 1rem;
  font-size: 1.8rem;
}
.public-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5em 1em;
  font-family: inherit;
  font-size: 1.1em;
  border: 1px solid var(--lightgray);
  border-radius: 7px;
  background: var(--light);
  color: var(--dark);
}
.public-search-input:focus {
  outline: none;
  border-color: var(--secondary);
}
.public-search-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
}
.public-search-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.25rem 0 0.75rem;
}
.public-search-chip {
  border: 1px solid var(--lightgray);
  background: var(--light);
  color: var(--secondary);
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.public-search-chip[data-on="true"] {
  background: var(--highlight);
  border-color: var(--secondary);
}
.public-search-results {
  margin-top: 0.5rem;
}
.public-search-status {
  color: var(--gray);
  font-size: 0.9rem;
  margin: 0.5rem 0 0.75rem;
}
a.public-search-result {
  display: block;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.6rem;
  text-decoration: none;
  color: var(--dark);
  background: var(--light);
  transition: background 0.15s ease;
}
a.public-search-result:hover,
a.public-search-result:focus {
  background: var(--lightgray);
  outline: none;
}
a.public-search-result h3 {
  margin: 0 0 0.25rem;
  color: var(--secondary);
  font-size: 1.05rem;
}
a.public-search-result p {
  margin: 0;
  color: var(--gray);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.public-search-result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--gray);
  align-items: center;
}
.public-search-result-meta .folder {
  color: var(--tertiary);
}
.public-search-result-meta .tag {
  background: var(--highlight);
  color: var(--secondary);
  border-radius: 6px;
  padding: 0 0.35rem;
}
`

export const PublicSearchBody: QuartzComponent = PublicSearchPage

/**
 * Constructor wrapper expected by the Quartz component system. The page type
 * calls this factory with the component options to obtain the renderable
 * component instance.
 */
export default (() => PublicSearchPage) satisfies QuartzComponentConstructor
