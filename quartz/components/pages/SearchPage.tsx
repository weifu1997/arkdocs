import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

/**
 * Public `/search` page.
 *
 * The page renders the filter controls and a result list, while the runtime
 * script (afterDOMLoaded) fetches `static/searchIndex.json` — a build-time
 * snapshot of published pages — and applies the same pure filtering/scoring
 * rules as `quartz/plugins/search/searchData.ts`. The URL contract is:
 *
 *   /search?q=<query>&tag=<tag>&tag=<tag>&folder=<folder>
 *
 * The filter state is driven by URLSearchParams so that refreshes and shared
 * URLs reproduce the exact same results.
 */
const SearchPage: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const rootClass = ["search-page", displayClass].filter(Boolean).join(" ")
  return (
    <div class={rootClass} id="search-page-root" data-page-search="">
      <div class="search-page-controls">
        <input
          id="search-page-q"
          class="search-page-input"
          type="search"
          autocomplete="off"
          placeholder="搜索页面…（可与标签、文件夹组合）"
          aria-label="查询词"
        />
        <input
          id="search-page-tags"
          class="search-page-input"
          type="text"
          autocomplete="off"
          placeholder="标签（AND，逗号分隔，如：中文, 教程）"
          aria-label="标签筛选"
        />
        <input
          id="search-page-folder"
          class="search-page-input"
          type="text"
          autocomplete="off"
          placeholder="文件夹（如 features，含子目录）"
          aria-label="文件夹筛选"
        />
        <button type="button" id="search-page-clear" class="search-page-clear" hidden={true}>
          清除筛选
        </button>
      </div>
      <div class="search-page-filters" id="search-page-filters" aria-live="polite"></div>
      <div class="search-page-status" id="search-page-status" role="status"></div>
      <ul class="search-page-results" id="search-page-results"></ul>
    </div>
  )
}

SearchPage.afterDOMLoaded = `
(function () {
  var INDEX = null;
  var LOADING = null;

  function root() {
    return document.getElementById("search-page-root");
  }

  function basePath() {
    var b = document.body.getAttribute("data-basepath") || "";
    return b.replace(/\\/+$/, "");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      if (c === "&") return "&amp;";
      if (c === "<") return "&lt;";
      if (c === ">") return "&gt;";
      if (c === '"') return "&quot;";
      return "&#039;";
    });
  }

  function norm(s) {
    return (s || "")
      .normalize("NFKD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, "-and-")
      .replace(/%/g, "-percent")
      .replace(/\\?/g, "")
      .replace(/#/g, "")
      .replace(/[<>:"|*]/g, "")
      .replace(/\\s+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function queryTerms(q) {
    var out = [];
    var seen = {};
    function push(t) {
      var n = norm(t);
      if (n && !seen[n]) { seen[n] = 1; out.push(n); }
    }
    (q || "").split(/\\s+/).forEach(function (chunk) {
      if (!chunk) return;
      var buf = "";
      for (var i = 0; i < chunk.length; i++) {
        var ch = chunk.charAt(i);
        var code = chunk.codePointAt(i) || 0;
        if (
          (code >= 0x3040 && code <= 0x30ff) ||
          (code >= 0x4e00 && code <= 0x9fff) ||
          (code >= 0xac00 && code <= 0xd7af) ||
          (code >= 0x20000 && code <= 0x2a6df)
        ) {
          if (buf) { push(buf); buf = ""; }
          push(ch);
        } else {
          buf += ch;
        }
      }
      if (buf) push(buf);
    });
    return out;
  }

  function readParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      q: (p.get("q") || "").trim(),
      tags: p.getAll("tag").map(function (t) { return t.trim(); }).filter(Boolean),
      folder: (p.get("folder") || "").trim(),
    };
  }

  function writeParams(state) {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    state.tags.forEach(function (t) { p.append("tag", t); });
    if (state.folder) p.set("folder", state.folder);
    var qs = p.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    window.history.replaceState(null, "", url);
  }

  function matchesTags(entry, tags) {
    if (tags.length === 0) return true;
    var have = {};
    (entry.tags || []).forEach(function (t) { have[norm(t)] = 1; });
    for (var i = 0; i < tags.length; i++) {
      if (!have[norm(tags[i])]) return false;
    }
    return true;
  }

  function matchesFolder(entry, folder) {
    if (!folder) return true;
    var want = norm(folder);
    if (!want) return true;
    var have = norm(entry.folder || "");
    return have === want || have.indexOf(want + "/") === 0;
  }

  function matchesQuery(entry, q) {
    var terms = queryTerms(q);
    if (terms.length === 0) return true;
    var hay = norm(entry.title + "\\n" + entry.content);
    for (var i = 0; i < terms.length; i++) {
      if (hay.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }

  function score(entry, q) {
    var terms = queryTerms(q);
    if (terms.length === 0) return 0;
    var t = norm(entry.title);
    var c = norm(entry.content);
    var s = 0;
    for (var i = 0; i < terms.length; i++) {
      var inT = t.indexOf(terms[i]) !== -1;
      var inC = c.indexOf(terms[i]) !== -1;
      if (!inT && !inC) return null;
      if (inT) s += 3;
      if (inC) s += 1;
    }
    return s;
  }

  function sortResults(list) {
    list.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var sa = (a.entry.slug || "").toLowerCase();
      var sb = (b.entry.slug || "").toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
    return list;
  }

  function entryHref(entry) {
    var slug = entry.slug || "";
    var href = slug.replace(/\\/$/, "");
    if (href === "index") {
      href = "";
    } else if (href.endsWith("/index")) {
      // Folder/index pages use the folder URL with a trailing slash.
      href = href.slice(0, -"/index".length) + "/";
    }
    return basePath() + "/" + href;
  }

  function loadIndex() {
    if (INDEX) return Promise.resolve(INDEX);
    if (LOADING) return LOADING;
    LOADING = fetch(basePath() + "/static/searchIndex.json", { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        INDEX = Array.isArray(data) ? data : [];
        LOADING = null;
        return INDEX;
      })
      .catch(function (err) {
        LOADING = null;
        throw err;
      });
    return LOADING;
  }

  function render() {
    var rootEl = root();
    if (!rootEl) return;
    var statusEl = document.getElementById("search-page-status");
    var listEl = document.getElementById("search-page-results");
    var filterEl = document.getElementById("search-page-filters");
    var state = readParams();

    var chips = [];
    if (state.q) chips.push({ kind: "query", label: state.q });
    state.tags.forEach(function (t) { chips.push({ kind: "tag", label: t }); });
    if (state.folder) chips.push({ kind: "folder", label: state.folder });
    filterEl.innerHTML = chips.length
      ? '<span class="search-page-chips">' +
        chips.map(function (chip) {
          return '<span class="search-chip search-chip-' + chip.kind + '">' + esc(chip.label) + "</span>";
        }).join("") + "</span>"
      : "";

    listEl.innerHTML = "";

    loadIndex()
      .then(function (index) {
        var hasFilter = state.q || state.tags.length > 0 || state.folder;
        if (!hasFilter) {
          statusEl.textContent = "输入查询词，或组合标签、文件夹进行筛选。";
          return;
        }
        var matched = index
          .filter(function (entry) {
            return matchesTags(entry, state.tags) && matchesFolder(entry, state.folder) && matchesQuery(entry, state.q);
          })
          .map(function (entry) { return { entry: entry, score: score(entry, state.q) || 0 }; });
        matched = sortResults(matched);
        if (matched.length === 0) {
          statusEl.textContent = "无匹配结果：请调整查询词、标签或文件夹。";
          return;
        }
        statusEl.textContent = "共 " + matched.length + " 条结果";
        matched.forEach(function (item) {
          var entry = item.entry;
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.className = "search-result-card";
          a.href = entryHref(entry);
          var title = document.createElement("h3");
          title.className = "search-result-title";
          title.textContent = entry.title || entry.slug;
          var desc = document.createElement("p");
          desc.className = "search-result-desc";
          desc.textContent = entry.description || "";
          var meta = document.createElement("p");
          meta.className = "search-result-meta";
          var folder = entry.folder || "";
          var parts = [];
          if (folder) parts.push("📁 " + folder);
          (entry.tags || []).forEach(function (t) { parts.append ? parts.append("#" + t) : parts.push("#" + t); });
          meta.textContent = parts.join("  ");
          a.appendChild(title);
          a.appendChild(desc);
          a.appendChild(meta);
          li.appendChild(a);
          listEl.appendChild(li);
        });
      })
      .catch(function () {
        INDEX = null;
        statusEl.textContent = "索引加载失败：请确认静态文件可访问，稍后重试。";
      });
  }

  var debounceTimer = null;
  function schedule() {
    var state = readParams();
    writeParams(state);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 150);
  }

  function syncInputs() {
    var state = readParams();
    var q = document.getElementById("search-page-q");
    var tags = document.getElementById("search-page-tags");
    var folder = document.getElementById("search-page-folder");
    if (q && q.value !== state.q) q.value = state.q;
    if (tags && tags.value !== state.tags.join(", ")) tags.value = state.tags.join(", ");
    if (folder && folder.value !== state.folder) folder.value = state.folder;
  }

  function syncClearButton(state) {
    var btn = document.getElementById("search-page-clear");
    if (!btn) return;
    var active = state.q || state.tags.length > 0 || state.folder;
    if (active) btn.removeAttribute("hidden");
    else btn.setAttribute("hidden", "");
  }

  function onInput() {
    var q = document.getElementById("search-page-q");
    var tags = document.getElementById("search-page-tags");
    var folder = document.getElementById("search-page-folder");
    var state = readParams();
    if (q) state.q = q.value.trim();
    if (tags) {
      state.tags = tags.value
        .split(",")
        .map(function (t) { return t.trim(); })
        .filter(Boolean);
    }
    if (folder) state.folder = folder.value.trim();
    writeParams(state);
    syncClearButton(state);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 150);
  }

  function onClear() {
    var q = document.getElementById("search-page-q");
    var tags = document.getElementById("search-page-tags");
    var folder = document.getElementById("search-page-folder");
    var state = { q: "", tags: [], folder: "" };
    if (q) q.value = "";
    if (tags) tags.value = "";
    if (folder) folder.value = "";
    writeParams(state);
    syncClearButton(state);
    render();
  }

  // Entry-point interception: the existing in-app search button opens the
  // modal on plain clicks, and ⌘/Ctrl+K still opens it via the modal's own
  // keydown listener. A plain click now navigates to the public /search
  // route instead. Capture phase + stopPropagation keeps the modal from
  // opening first.
  function currentSlug() {
    return document.body.getAttribute("data-slug") || "";
  }

  function bindEntry() {
    var buttons = document.querySelectorAll(".search-button");
    buttons.forEach(function (btn) {
      if (btn.getAttribute("data-search-entry-bound")) return;
      btn.setAttribute("data-search-entry-bound", "1");
      btn.addEventListener(
        "click",
        function (ev) {
          if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return;
          if (currentSlug() === "search") return;
          ev.preventDefault();
          ev.stopPropagation();
          var target = basePath() + "/search";
          if (typeof window.spaNavigate === "function") {
            window.spaNavigate(new URL(target, window.location.origin));
          } else {
            window.location.href = target;
          }
        },
        true,
      );
    });
  }

  function init() {
    bindEntry();
    var rootEl = root();
    if (!rootEl) return;
    syncInputs();
    syncClearButton(readParams());
    render();
  }

  function bind() {
    ["search-page-q", "search-page-tags", "search-page-folder"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.getAttribute("data-search-bound")) {
        el.setAttribute("data-search-bound", "1");
        el.addEventListener("input", onInput);
      }
    });
    var clearBtn = document.getElementById("search-page-clear");
    if (clearBtn && !clearBtn.getAttribute("data-search-bound")) {
      clearBtn.setAttribute("data-search-bound", "1");
      clearBtn.addEventListener("click", onClear);
    }
    window.addEventListener("popstate", function () {
      bindEntry();
      if (root()) {
        syncInputs();
        render();
      }
    });
    document.addEventListener("nav", init);
    document.addEventListener("render", init);
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
`

SearchPage.css = `
.search-page {
  max-width: 44rem;
  margin: 0 auto;
}

.search-page-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-page-input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.5em 1em;
  font-family: var(--bodyFont);
  font-size: 1.05em;
  color: var(--dark);
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 7px;
}

.search-page-input:focus {
  outline: 2px solid var(--tertiary);
  outline-offset: 1px;
}

.search-page-clear {
  align-self: flex-start;
  padding: 0.25rem 0.75rem;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--darkgray);
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  cursor: pointer;
}

.search-page-clear:hover {
  border-color: var(--tertiary);
  color: var(--tertiary);
}

.search-page-chips {
  display: block;
  margin-bottom: 0.5rem;
}

.search-chip {
  display: inline-block;
  margin-right: 0.4rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: var(--highlight);
  color: var(--secondary);
}

.search-chip-tag {
  background: var(--highlight);
  color: var(--tertiary);
}

.search-chip-folder {
  background: var(--lightgray);
  color: var(--darkgray);
}

.search-page-status {
  min-height: 1.5em;
  margin-bottom: 0.75rem;
  color: var(--gray);
  font-size: 0.9em;
}

.search-page-results {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-result-card {
  display: block;
  padding: 0.9em 1em;
  margin-bottom: 0.6rem;
  border: 1px solid var(--lightgray);
  border-radius: 7px;
  background: var(--light);
  text-decoration: none;
  color: var(--dark);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.search-result-card:hover,
.search-result-card:focus-visible {
  border-color: var(--tertiary);
  background: var(--highlight);
  outline: none;
}

.search-result-title {
  margin: 0 0 0.25rem;
  color: var(--secondary);
  font-size: 1.05em;
}

.search-result-desc {
  margin: 0 0 0.35rem;
  color: var(--gray);
  font-size: 0.9em;
  line-height: 1.5;
}

.search-result-meta {
  margin: 0;
  color: var(--darkgray);
  font-size: 0.8em;
}
`

export default (() => SearchPage) satisfies QuartzComponentConstructor
