import { i18n } from "../../i18n"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
// @ts-ignore
import searchPageScript from "../scripts/searchPage.inline"

// Public /search page styling. Inlined as a CSS string because the component
// resources emitter collects `component.css` through the page type registry
// (the same mechanism other page bodies use), and the TSX module must also be
// importable by the offline test harness.
const searchPageCSS = `
.search-page {
  margin: 1rem 0 2rem;
  max-width: 52rem;
}

.search-page-title {
  margin: 0 0 1rem;
}

.search-page-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-page-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.search-page-label {
  font-size: 0.85rem;
  color: var(--gray);
  white-space: nowrap;
}

.search-page-query,
.search-page-filter {
  box-sizing: border-box;
  width: 100%;
  font-family: var(--bodyFont);
  font-size: 1.05em;
  color: var(--dark);
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  padding: 0.5em 0.75em;
}

.search-page-query:focus,
.search-page-filter:focus {
  outline: none;
  border-color: var(--secondary);
}

.search-page-filter {
  flex: 1;
  min-width: 9rem;
  font-size: 0.95em;
}

.search-page-clear {
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--secondary);
  background: transparent;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  padding: 0.45em 0.9em;
  cursor: pointer;
}

.search-page-clear:hover {
  background: var(--lightgray);
}

.search-page-status {
  min-height: 1.2em;
  font-size: 0.9rem;
  color: var(--gray);
  margin-bottom: 0.5rem;
}

.search-page-results {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-page-result {
  margin-bottom: 1rem;
}

.search-page-result > .search-page-link {
  display: block;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  padding: 0.85em 1em;
  color: var(--dark);
  text-decoration: none;
}

.search-page-result > .search-page-link:hover {
  border-color: var(--secondary);
}

.search-page-link-title {
  margin: 0 0 0.3em;
  font-size: 1.05rem;
  color: var(--secondary);
}

.search-page-summary {
  margin: 0 0 0.5em;
  font-size: 0.9rem;
  color: var(--darkgray);
}

.search-page-path {
  margin: 0 0 0.4em;
  font-size: 0.8rem;
  color: var(--gray);
}

.search-page-tags {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.search-page-tags > li {
  margin: 0;
}

.search-page-tags > li > p {
  margin: 0;
  display: inline-block;
  padding: 0.1em 0.5em;
  border-radius: 999px;
  background-color: var(--highlight);
  font-size: 0.8rem;
  color: var(--secondary);
}
`

// UI strings for the dedicated public /search page. New keys introduced for
// this page fall back to zh-CN / English defaults when the locale does not
// provide them.
const strings: Record<string, { tagFilter: string; folderLabel: string; clear: string }> = {
  "zh-CN": { tagFilter: "标签", folderLabel: "文件夹", clear: "清空" },
  "zh-TW": { tagFilter: "標籤", folderLabel: "資料夾", clear: "清除" },
  en: { tagFilter: "Tag", folderLabel: "Folder", clear: "Clear" },
}

const SearchPageBody: QuartzComponent = ({ cfg }: QuartzComponentProps) => {
  const search = i18n(cfg.locale).components.search
  const lang = cfg.locale?.startsWith("zh") ? cfg.locale : "en"
  const s = strings[lang] ?? strings.en
  return (
    <article class="search-page">
      <h1 class="search-page-title">{search.title}</h1>
      <div class="search-page-controls" role="search">
        <input
          id="search-page-query"
          class="search-page-query"
          type="search"
          autocomplete="off"
          enterkeyhint="search"
          placeholder={search.searchBarPlaceholder}
          aria-label={search.searchBarPlaceholder}
        />
        <div class="search-page-row">
          <label class="search-page-label" for="search-page-tag">
            {s.tagFilter}
          </label>
          <input
            id="search-page-tag"
            class="search-page-filter"
            type="text"
            autocomplete="off"
            placeholder="tag1, tag2 (AND)"
            aria-label={s.tagFilter}
          />
          <label class="search-page-label" for="search-page-folder">
            {s.folderLabel}
          </label>
          <input
            id="search-page-folder"
            class="search-page-filter"
            type="text"
            autocomplete="off"
            placeholder="features"
            aria-label={s.folderLabel}
          />
          <button type="button" id="search-page-clear" class="search-page-clear">
            {s.clear}
          </button>
        </div>
      </div>
      <div class="search-page-status" id="search-page-status" aria-live="polite"></div>
      <ol id="search-page-results" class="search-page-results"></ol>
    </article>
  )
}

SearchPageBody.afterDOMLoaded = searchPageScript
SearchPageBody.css = searchPageCSS

export default (() => SearchPageBody) satisfies QuartzComponentConstructor
