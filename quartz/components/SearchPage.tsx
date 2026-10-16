import { QuartzComponent, QuartzComponentConstructor } from "./types"

const SearchPage: QuartzComponent = () => {
  return (
    <div class="search-page" data-state="idle">
      <div class="search-page-toolbar">
        <label class="search-page-field">
          <span class="search-page-label">查询词</span>
          <input class="search-page-query" type="search" name="q" autocomplete="off" />
        </label>
        <label class="search-page-field">
          <span class="search-page-label">标签（AND，多个用空格分隔）</span>
          <input
            class="search-page-tags"
            type="search"
            name="tag"
            placeholder="标签（可输入多个，如：组件）"
            autocomplete="off"
          />
        </label>
        <label class="search-page-field">
          <span class="search-page-label">文件夹（匹配该目录及子目录）</span>
          <input
            class="search-page-folder"
            type="search"
            name="folder"
            placeholder="文件夹（如：features）"
            autocomplete="off"
          />
        </label>
        <button class="search-page-reset" type="button">
          清空筛选
        </button>
      </div>
      <p class="search-page-status">输入查询词、标签或文件夹以筛选公开页面。</p>
      <ul class="search-page-results" role="listbox" aria-label="搜索结果" hidden />
    </div>
  )
}

SearchPage.css = `
.search-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-page-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.search-page-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 14rem;
  min-width: 10rem;
}

.search-page-label {
  font-size: 0.85rem;
  color: var(--gray);
}

.search-page-field input {
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  font-size: 1rem;
  color: var(--dark);
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 6px;
}

.search-page-field input:focus {
  outline: 2px solid var(--tertiary);
  outline-offset: 1px;
}

.search-page-reset {
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--dark);
  background: transparent;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  cursor: pointer;
}

.search-page-reset:hover {
  background: var(--lightgray);
}

.search-page-status {
  margin: 0;
  color: var(--gray);
  font-size: 0.9rem;
}

.search-page-results {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-page-result {
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--light);
}

.search-page-result-link {
  display: block;
  font-weight: 700;
  color: var(--secondary);
  text-decoration: none;
}

.search-page-result-link:hover {
  text-decoration: underline;
}

.search-page-result-meta {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: var(--gray);
}

.search-page-result-description {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--gray);
  line-height: 1.5;
}
`

// The runtime is bundled by the build pipeline through the inline loader;
// importing it here registers its side effects on the /search page.
// @ts-ignore - the .inline.ts loader provides the raw client source.
import searchPageScript from "./scripts/search-page.inline"
SearchPage.afterDOMLoaded = searchPageScript as unknown as string

export default (() => SearchPage) satisfies QuartzComponentConstructor
