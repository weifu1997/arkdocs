---
title: "升级 Quartz"
aliases:
  - upgrading
---

> [!note]
> 本指南专门用于将 Quartz 升级到更新版本。如果你来自 Quartz 4 或 Quartz 3，请参阅 [[migrating|迁移指南]]。

要获取最新的 Quartz 更新，只需运行

```bash
npx quartz upgrade
```

Quartz 底层使用 [git](https://git-scm.com/) 进行版本管理，因此升级实际上就是从官方 Quartz GitHub 仓库拉取更新。`quartz.lock.json` 中的合并冲突会自动处理 — Quartz 会在拉取前备份锁定文件，并在之后恢复。对于其他与更新冲突的本地修改文件，你可能需要自行手动解决（或者使用 `git pull origin upstream` 手动拉取）。

> [!hint]
> Quartz 会在升级前尽量缓存你的内容，以减少合并冲突。如果在合并过程中出现冲突，可以停止合并，然后运行 `npx quartz restore` 从缓存恢复内容。

如果你安装了 [GitHub desktop app](https://desktop.github.com/)，它会自动打开以帮助解决冲突。否则，你需要在 VSCode 这类文本编辑器中解决。手动解决冲突的更多说明见 [GitHub 的合并冲突指南](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line#competing-line-change-merge-conflicts)。

要单独更新已安装的插件，请使用：

```bash
npx quartz plugin install --latest
```

可用参数的更多细节见 [[upgrade|upgrade 的 CLI 参考]]。

### 布局系统变更

The `footer` layout slot is now an array of components, consistent with other layout slots like `header`, `left`, and `right`. Additionally, `header` and `footer` are now configurable layout positions — plugins can declare `layout: { position: header }` or `layout: { position: footer }` in their YAML config.

**If you override layouts in `quartz.ts`**, update any `footer` assignments to use arrays:

```ts title="quartz.ts"
// Before
export const layout = await loadQuartzLayout({
  defaults: { footer: MyFooterComponent },
})

// After
export const layout = await loadQuartzLayout({
  defaults: { footer: [MyFooterComponent] },
})
```

**If you have a custom page frame**, update the `render` function to iterate the footer array:

```tsx
// Before
render({ footer: Footer, ...rest }: PageFrameProps) {
  return <Footer {...componentData} />
}

// After
render({ footer, ...rest }: PageFrameProps) {
  return footer.map((F) => <F {...componentData} />)
}
```

Both changes are caught by TypeScript at compile time — running `npx quartz build` will show the error.

No changes are needed for `quartz.config.yaml` — the YAML format is unchanged.

### Cleaning Up Unused Plugins

If you've removed plugins from your configuration during an upgrade, you can clean up the leftover files:

```bash
npx quartz plugin prune --dry-run  # preview what would be removed
npx quartz plugin prune            # remove orphaned plugins
```

See the [[cli/plugin#prune|plugin prune reference]] for more details.

## Switching to npm Plugin Specifiers

First-party Quartz plugins are now published to npm under the `@quartz-community` scope. If your `quartz.config.yaml` uses `github:` specifiers, you can optionally switch to npm specifiers for faster installs and better version pinning.

### Why Switch?

- **Faster installs**: npm packages are cached locally and don't require git cloning
- **Version pinning**: npm uses semver ranges, so you control when to update
- **No build step**: npm packages ship pre-built, unlike git sources which may need to build on install

### How to Migrate

Update each plugin source in your `quartz.config.yaml` from the `github:` format to the quoted npm format:

```yaml
# Before
plugins:
  - source: github:quartz-community/syntax-highlighting
    enabled: true

# After
plugins:
  - source: "@quartz-community/syntax-highlighting"
    enabled: true
```

> [!important]
> The `@` scoped name must be quoted in YAML. Use double quotes around the source value.

Then install the packages:

```bash
npm install @quartz-community/syntax-highlighting
```

Or install all default plugins at once:

```bash
npm install @quartz-community/created-modified-date @quartz-community/syntax-highlighting @quartz-community/obsidian-flavored-markdown @quartz-community/github-flavored-markdown @quartz-community/table-of-contents @quartz-community/crawl-links @quartz-community/description @quartz-community/latex @quartz-community/quartz-fonts @quartz-community/remove-draft @quartz-community/alias-redirects @quartz-community/content-index @quartz-community/favicon @quartz-community/og-image @quartz-community/cname @quartz-community/canvas-page @quartz-community/content-page @quartz-community/folder-page @quartz-community/tag-page @quartz-community/explorer @quartz-community/graph @quartz-community/search @quartz-community/backlinks @quartz-community/article-title @quartz-community/content-meta @quartz-community/page-title @quartz-community/darkmode @quartz-community/reader-mode @quartz-community/breadcrumbs @quartz-community/footer @quartz-community/spacer @quartz-community/bases-page @quartz-community/note-properties @quartz-community/unlisted-pages @quartz-community/encrypted-pages
```

### Do I Have to Switch?

No. The `github:` specifiers continue to work and will be supported indefinitely. They are still the recommended approach for third-party and community plugins that are not published to npm. The npm path is an optional improvement for first-party plugins.
