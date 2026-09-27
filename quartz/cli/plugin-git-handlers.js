import fs from "fs"
import path from "path"
import os from "os"
import { exec as execCb, execSync } from "child_process"
import { styleText, promisify } from "util"
import {
  readPluginsJson,
  writePluginsJson,
  readLockfile,
  writeLockfile,
  extractPluginName,
  readManifestFromPackageJson,
  parseGitSource,
  getGitCommit,
  PLUGINS_DIR,
  LOCKFILE_PATH,
  isLocalSource,
  getSourceUrl,
  formatSource,
  resolveLockfileName,
  getNameOverrides,
} from "./plugin-data.js"
import { symlinkOrCopySync } from "./helpers.js"

const INTERNAL_EXPORTS = new Set(["manifest", "default"])

const execAsync = promisify(execCb)

async function cloneWithSubdirAsync({ url, ref, subdir, pluginDir }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "quartz-plugin-"))
  try {
    if (ref) {
      await execAsync(`git clone --depth 1 --branch ${ref} "${url}" "${tmpDir}"`)
    } else {
      await execAsync(`git clone --depth 1 "${url}" "${tmpDir}"`)
    }
    const subdirPath = path.join(tmpDir, subdir)
    if (!fs.existsSync(subdirPath)) {
      throw new Error(`Subdirectory "${subdir}" not found in cloned repository`)
    }
    fs.cpSync(subdirPath, pluginDir, { recursive: true })
    const { stdout } = await execAsync("git rev-parse HEAD", { cwd: tmpDir })
    return stdout.trim()
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function buildPluginAsync(pluginDir, name) {
  if (hasPrebuiltDist(pluginDir)) {
    console.log(styleText("green", `  ✓ ${name}：使用预构建的 dist/`))
    linkPeerPlugins(pluginDir)
    return true
  }

  try {
    const skipBuild = !needsBuild(pluginDir)
    console.log(styleText("cyan", `  → ${name}：正在安装依赖...`))
    await execAsync("npm install --ignore-scripts", { cwd: pluginDir })
    if (!skipBuild) {
      console.log(styleText("cyan", `  → ${name}：正在构建...`))
      await execAsync("npm run build", { cwd: pluginDir })
    }
    await execAsync("npm prune --omit=dev", { cwd: pluginDir })
    linkPeerPlugins(pluginDir)
    return true
  } catch (error) {
    console.log(styleText("red", `  ✗ ${name}：构建失败`))
    return false
  }
}

/**
 * Run async tasks with bounded concurrency.
 * @param {Array} items - Items to process
 * @param {number} concurrency - Max parallel tasks
 * @param {Function} fn - Async function to run per item
 * @returns {Promise<Array>} Results in order
 */
async function runParallel(items, concurrency, fn) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/**
 * Check whether a plugin's .gitignore excludes dist/.
 * When dist/ is gitignored, the plugin cannot ship pre-built output in version
 * control (e.g. because it uses tree-shaking) and must always be built locally.
 */
function isDistGitignored(pluginDir) {
  const gitignorePath = path.join(pluginDir, ".gitignore")
  if (!fs.existsSync(gitignorePath)) return false

  const lines = fs.readFileSync(gitignorePath, "utf-8").split("\n")
  return lines.some((line) => {
    const trimmed = line.trim()
    return trimmed === "dist" || trimmed === "dist/" || trimmed === "/dist" || trimmed === "/dist/"
  })
}

function hasPrebuiltDist(pluginDir) {
  const distDir = path.join(pluginDir, "dist")
  return fs.existsSync(distDir) && !isDistGitignored(pluginDir)
}

function needsBuild(pluginDir) {
  if (isDistGitignored(pluginDir)) return true
  const distDir = path.join(pluginDir, "dist")
  return !fs.existsSync(distDir)
}

/**
 * After pruning devDependencies, peerDependencies may no longer be installed
 * in the plugin's own node_modules. This function resolves them:
 *
 *  1. @quartz-community/* peers → symlink to the co-installed sibling plugin
 *  2. All other peers → symlink to the host Quartz node_modules so plugins
 *     share a single copy of packages like unified, vfile, rehype-raw, etc.
 */
function trySymlink(target, linkPath) {
  symlinkOrCopySync(target, linkPath)
}

function linkPeerPlugins(pluginDir) {
  const pkgPath = path.join(pluginDir, "package.json")
  if (!fs.existsSync(pkgPath)) return

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
  const peers = pkg.peerDependencies ?? {}

  const quartzRoot = path.resolve(pluginDir, "..", "..", "..")
  const hostNodeModules = path.join(quartzRoot, "node_modules")

  for (const peerName of Object.keys(peers)) {
    const peerNodeModulesPath = path.join(pluginDir, "node_modules", ...peerName.split("/"))
    if (fs.existsSync(peerNodeModulesPath)) continue

    if (peerName.startsWith("@quartz-community/")) {
      const siblingPlugin = findPluginByPackageName(peerName)
      if (!siblingPlugin) continue

      const scopeDir = path.join(pluginDir, "node_modules", peerName.split("/")[0])
      fs.mkdirSync(scopeDir, { recursive: true })

      const target = path.relative(scopeDir, siblingPlugin)
      trySymlink(target, peerNodeModulesPath)
      continue
    }

    const hostPeerPath = path.join(hostNodeModules, ...peerName.split("/"))
    if (!fs.existsSync(hostPeerPath)) continue

    const parts = peerName.split("/")
    if (parts.length > 1) {
      const scopeDir = path.join(pluginDir, "node_modules", parts[0])
      fs.mkdirSync(scopeDir, { recursive: true })
    } else {
      fs.mkdirSync(path.join(pluginDir, "node_modules"), { recursive: true })
    }

    const target = path.relative(path.dirname(peerNodeModulesPath), hostPeerPath)
    trySymlink(target, peerNodeModulesPath)
  }
}

/**
 * Search installed plugins for one whose package.json "name" matches the given
 * npm package name (e.g. "@quartz-community/bases-page").
 */
function findPluginByPackageName(packageName) {
  if (!fs.existsSync(PLUGINS_DIR)) return null

  const plugins = fs.readdirSync(PLUGINS_DIR).filter((entry) => {
    const entryPath = path.join(PLUGINS_DIR, entry)
    return fs.statSync(entryPath).isDirectory()
  })

  for (const pluginDirName of plugins) {
    const pkgPath = path.join(PLUGINS_DIR, pluginDirName, "package.json")
    if (!fs.existsSync(pkgPath)) continue
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      if (pkg.name === packageName) {
        return path.join(PLUGINS_DIR, pluginDirName)
      }
    } catch {}
  }
  return null
}

const PLUGIN_TYPE_PATTERN =
  /Quartz(?:Emitter|Transformer|Filter|PageType)Plugin|QuartzComponentConstructor|\(.*\)\s*=>\s*QuartzComponent\b/

function resolveOriginalName(exportName, dtsContent) {
  const aliasPattern = new RegExp(`(\\w+)\\s+as\\s+${exportName}\\b`)
  const match = dtsContent.match(aliasPattern)
  return match ? match[1] : exportName
}

function isOverridableExport(name, dtsContent) {
  const declName = resolveOriginalName(name, dtsContent)
  const declPattern = new RegExp(`declare\\s+const\\s+${declName}\\s*:\\s*(.+?)(?:;|$)`, "m")
  const match = dtsContent.match(declPattern)
  if (!match) return false
  return PLUGIN_TYPE_PATTERN.test(match[1])
}

function parseExportsFromDts(content) {
  const exports = []
  const exportMatches = content.matchAll(/export\s*{\s*([^}]+)\s*}(?:\s*from\s*['"]([^'"]+)['"])?/g)
  for (const match of exportMatches) {
    const fromModule = match[2]
    if (fromModule?.startsWith("@")) continue

    const names = match[1]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
    for (const name of names) {
      const cleanName = name.split(" as ").pop()?.trim() || name.trim()
      if (cleanName && !cleanName.startsWith("_") && !INTERNAL_EXPORTS.has(cleanName)) {
        const finalName = cleanName.replace(/^type\s+/, "")
        if (name.includes("type ")) {
          exports.push(`type ${finalName}`)
        } else {
          exports.push(finalName)
        }
      }
    }
  }
  return exports
}

async function regeneratePluginIndex() {
  if (!fs.existsSync(PLUGINS_DIR)) return

  const pluginDirs = fs.readdirSync(PLUGINS_DIR).filter((name) => {
    const pluginPath = path.join(PLUGINS_DIR, name)
    return fs.statSync(pluginPath).isDirectory()
  })

  // Phase 1: Collect all exports per plugin, detect conflicts
  const pluginExports = new Map()
  const nameCount = new Map()

  for (const pluginName of pluginDirs) {
    const pluginDir = path.join(PLUGINS_DIR, pluginName)
    const distIndex = path.join(pluginDir, "dist", "index.d.ts")

    if (!fs.existsSync(distIndex)) continue

    const dtsContent = fs.readFileSync(distIndex, "utf-8")
    const exportedNames = parseExportsFromDts(dtsContent)
    const named = exportedNames.filter((e) => !e.startsWith("type "))
    const types = exportedNames.filter((e) => e.startsWith("type ")).map((e) => e.slice(5))

    const overridable = named.filter((n) => isOverridableExport(n, dtsContent))
    const passthrough = named.filter((n) => !isOverridableExport(n, dtsContent))

    if (overridable.length > 0 || passthrough.length > 0 || types.length > 0) {
      pluginExports.set(pluginName, { overridable, passthrough, types })
      for (const n of [...overridable, ...passthrough]) {
        nameCount.set(n, (nameCount.get(n) ?? 0) + 1)
      }
    }
  }

  // Phase 2: Generate index with registry import, plugin map, and conditional top-level exports
  const lines = []

  lines.push(`import { componentRegistry } from "../../quartz/components/registry"`)
  lines.push("")

  // Type re-exports
  for (const [pluginName, { types }] of pluginExports) {
    if (types.length > 0) {
      lines.push(`export type { ${types.join(", ")} } from "./${pluginName}"`)
    }
  }

  // Direct re-exports for non-overridable values (constants, utility functions, etc.)
  for (const [pluginName, { passthrough }] of pluginExports) {
    if (passthrough.length === 0) continue
    const unique = passthrough.filter((n) => (nameCount.get(n) ?? 0) === 1)
    if (unique.length > 0) {
      lines.push(`export { ${unique.join(", ")} } from "./${pluginName}"`)
    }
  }
  lines.push("")

  // Generate the plugins map with override wrappers (overridable exports only)
  lines.push(
    `export const plugins: Record<string, Record<string, (...args: unknown[]) => void>> = {`,
  )
  for (const [pluginName, { overridable }] of pluginExports) {
    if (overridable.length === 0) continue
    const escapedName = pluginName.replace(/"/g, '\\"')
    lines.push(`  "${escapedName}": {`)
    for (const n of overridable) {
      lines.push(
        `    ${n}: (...args: unknown[]) => { componentRegistry.setOptionOverrides("${escapedName}", args[0] as Record<string, unknown>); },`,
      )
    }
    lines.push(`  },`)
  }
  lines.push(`}`)
  lines.push("")

  // Top-level exports for overridable names: alias to the plugins map wrapper
  for (const [pluginName, { overridable }] of pluginExports) {
    if (overridable.length === 0) continue

    const unique = overridable.filter((n) => (nameCount.get(n) ?? 0) === 1)
    const conflicting = overridable.filter((n) => (nameCount.get(n) ?? 0) > 1)

    if (unique.length > 0) {
      const escapedName = pluginName.replace(/"/g, '\\"')
      for (const n of unique) {
        lines.push(`export const ${n} = plugins["${escapedName}"].${n}`)
      }
    }

    if (conflicting.length > 0) {
      for (const n of conflicting) {
        console.warn(
          styleText("yellow", `⚠`),
          `Export "${n}" conflicts across plugins — use plugins["${pluginName}"].${n} in quartz.ts`,
        )
      }
    }
  }

  lines.push("")

  const indexContent = lines.join("\n")
  const indexPath = path.join(PLUGINS_DIR, "index.ts")
  fs.writeFileSync(indexPath, indexContent)
}

export async function handlePluginInstallUnified({
  names,
  fromConfig = false,
  latest = false,
  clean = false,
  dryRun = false,
  concurrency: concurrencyOption,
} = {}) {
  if (clean && latest) {
    console.log(styleText("red", "✗ --clean 与 --latest 不能同时使用"))
    return
  }

  const resolvedConcurrency = Math.max(1, concurrencyOption ?? os.cpus().length)

  const pluginsJson = readPluginsJson()
  let lockfile = readLockfile()

  if (!fromConfig && !lockfile) {
    console.log(
      styleText("yellow", "⚠ 未找到 quartz.lock.json。请先运行 'npx quartz plugin add <repo>'。"),
    )
    return
  }

  const resolvedNames = names
    ? names.map((name) =>
        resolveLockfileName(name, lockfile ?? { version: "1.0.0", plugins: {} }, pluginsJson),
      )
    : null
  const nameFilter = resolvedNames ? new Set(resolvedNames) : null

  if (dryRun && latest) {
    if (!lockfile || Object.keys(lockfile.plugins).length === 0) {
      console.log(styleText("gray", "尚未安装插件"))
      return
    }

    const nameOverrides = getNameOverrides(lockfile, pluginsJson)

    const rows = Object.entries(lockfile.plugins)
      .filter(([name]) => !nameFilter || nameFilter.has(name))
      .map(([name, entry]) => ({
        name,
        entry,
        displayName: nameOverrides.get(name) ?? name,
      }))

    const isTTY = process.stdout.isTTY
    const nameWidth = Math.max(6, ...rows.map((row) => row.displayName.length)) + 2
    const header = `${"插件".padEnd(nameWidth)}${"已安装".padEnd(12)}${"最新".padEnd(12)}状态`

    const renderRow = ({ displayName }, installed, latest, statusLabel) =>
      `${displayName.padEnd(nameWidth)}${installed.padEnd(12)}${latest.padEnd(12)}${statusLabel}`

    const updateRow = (index, installed, latest, statusLabel) => {
      if (!isTTY) return
      const offset = rows.length - index
      process.stdout.write(
        `\x1b[${offset}A\x1b[2K\r${renderRow(rows[index], installed, latest, statusLabel)}\x1b[${offset}B`,
      )
    }

    if (isTTY) {
      console.log(styleText("bold", "正在检查插件更新...\n"))
      console.log(styleText("bold", header))
      console.log("─".repeat(header.length))
      for (const row of rows) {
        if (row.entry.commit === "local") {
          console.log(renderRow(row, "local", "—", styleText("green", "local")))
          continue
        }
        console.log(renderRow(row, row.entry.commit.slice(0, 7), "—", styleText("cyan", "⋯")))
      }
    }

    const promises = rows.map((row, index) => {
      if (row.entry.commit === "local") {
        return Promise.resolve({
          index,
          installed: "local",
          latest: "—",
          status: "local",
        })
      }

      const lsRemoteRef = row.entry.ref ? `refs/heads/${row.entry.ref}` : "HEAD"
      return execAsync(`git ls-remote "${row.entry.resolved}" ${lsRemoteRef}`)
        .then(({ stdout }) => {
          const latestCommit = stdout.split("\t")[0].trim()
          const isCurrent = latestCommit === row.entry.commit
          const installed = row.entry.commit.slice(0, 7)
          const latest = latestCommit.slice(0, 7)
          const statusLabel = isCurrent
            ? styleText("green", "已是最新")
            : styleText("yellow", "有可用更新")
          updateRow(index, installed, latest, statusLabel)
          return {
            index,
            installed,
            latest,
            status: isCurrent ? "已是最新" : "有可用更新",
          }
        })
        .catch(() => {
          const installed = row.entry.commit.slice(0, 7)
          const latest = "?"
          const statusLabel = styleText("red", "检查失败")
          updateRow(index, installed, latest, statusLabel)
          return {
            index,
            installed,
            latest,
            status: "检查失败",
          }
        })
    })

    const results = await Promise.all(promises)

    if (!isTTY) {
      console.log(styleText("bold", "正在检查插件更新...\n"))
      console.log(styleText("bold", header))
      console.log("─".repeat(header.length))
      for (const { index, installed, latest, status } of results) {
        const color =
          status === "已是最新" || status === "local"
            ? "green"
            : status === "检查失败"
              ? "red"
              : "yellow"
        console.log(renderRow(rows[index], installed, latest, styleText(color, status)))
      }
    }
    return
  }

  if (fromConfig) {
    if (!pluginsJson?.plugins || pluginsJson.plugins.length === 0) {
      console.log(styleText("gray", "尚未配置插件"))
      return
    }

    if (!lockfile) {
      lockfile = { version: "1.0.0", plugins: {} }
    }

    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    }

    const configNames = new Set(pluginsJson.plugins.map((entry) => extractPluginName(entry.source)))
    const orphans = Object.keys(lockfile.plugins).filter((name) => !configNames.has(name))

    const missing = pluginsJson.plugins
      .filter((entry) => {
        const name = extractPluginName(entry.source)
        const pluginDir = path.join(PLUGINS_DIR, name)
        if (lockfile.plugins[name] && fs.existsSync(pluginDir)) return false
        const src = getSourceUrl(entry.source)
        return (
          src.startsWith("github:") ||
          src.startsWith("git+") ||
          src.startsWith("https://") ||
          isLocalSource(src)
        )
      })
      .filter((entry) => {
        if (!nameFilter) return true
        const name = extractPluginName(entry.source)
        return nameFilter.has(name)
      })

    if (missing.length === 0) {
      console.log(styleText("green", "✓ 配置中的插件均已安装"))
      if (dryRun) {
        if (orphans.length > 0) {
          console.log()
          console.log(`在锁定文件中发现 ${orphans.length} 个孤立插件：\n`)
          for (const name of orphans) {
            console.log(`  ${styleText("yellow", name)} — 存在于锁定文件但不在配置中`)
          }
          console.log()
          console.log(
            styleText("cyan", "试运行，未做任何更改。去掉 --dry-run 后重新运行即可实际处理。"),
          )
        }
        return
      }
      if (orphans.length === 0) {
        return
      }
    }

    if (missing.length > 0) {
      console.log(`配置中发现 ${missing.length} 个尚未安装的插件：\n`)
      for (const entry of missing) {
        const name = extractPluginName(entry.source)
        console.log(`  ${styleText("yellow", name)} — ${formatSource(entry.source)}`)
      }
      console.log()

      if (dryRun) {
        if (orphans.length > 0) {
          console.log(`在锁定文件中发现 ${orphans.length} 个孤立插件：\n`)
          for (const name of orphans) {
            console.log(`  ${styleText("yellow", name)} — 存在于锁定文件但不在配置中`)
          }
          console.log()
        }
        console.log(
          styleText("cyan", "试运行，未做任何更改。去掉 --dry-run 后重新运行即可实际处理。"),
        )
        return
      }
    }

    const installed = []
    let failed = 0
    let lockfileChanged = false

    // Handle existing dirs and local symlinks (fast), collect remote clones
    const remoteEntries = []
    for (const entry of missing) {
      try {
        const { name, url, ref, local, subdir } = parseGitSource(entry.source)
        const pluginDir = path.join(PLUGINS_DIR, name)

        if (fs.existsSync(pluginDir)) {
          if (local) {
            console.log(
              styleText("yellow", `⚠ ${name} 目录已存在，正在更新锁定文件`),
            )
            lockfile.plugins[name] = {
              source: entry.source,
              resolved: url,
              commit: "local",
              ...(subdir && { subdir }),
              installedAt: new Date().toISOString(),
            }
            installed.push({ name, pluginDir })
            lockfileChanged = true
            continue
          }
          console.log(styleText("yellow", `⚠ ${name} 目录已存在，正在更新锁定文件`))
          const commit = getGitCommit(pluginDir)
          lockfile.plugins[name] = {
            source: entry.source,
            resolved: url,
            commit,
            ...(ref && { ref }),
            ...(subdir && { subdir }),
            installedAt: new Date().toISOString(),
          }
          installed.push({ name, pluginDir })
          lockfileChanged = true
          continue
        }

        if (local) {
          let resolvedPath = path.resolve(url)
          if (subdir) resolvedPath = path.join(resolvedPath, subdir)
          if (!fs.existsSync(resolvedPath)) {
            console.log(styleText("red", `✗ 本地路径不存在：${resolvedPath}`))
            failed++
            continue
          }
          console.log(styleText("cyan", `→ 正在从 ${resolvedPath} 链接 ${name}...`))
          fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
          symlinkOrCopySync(resolvedPath, pluginDir)
          lockfile.plugins[name] = {
            source: entry.source,
            resolved: resolvedPath,
            commit: "local",
            ...(subdir && { subdir }),
            installedAt: new Date().toISOString(),
          }
          installed.push({ name, pluginDir })
          lockfileChanged = true
          console.log(styleText("green", `✓ 已链接 ${name}（本地）`))
        } else {
          remoteEntries.push({ entry, name, url, ref, subdir, pluginDir })
        }
      } catch (error) {
        console.log(styleText("red", `✗ 解析 ${formatSource(entry.source)} 失败：${error}`))
        failed++
      }
    }

    // Clone remote plugins in parallel
    if (remoteEntries.length > 0) {
      const concurrency = resolvedConcurrency
      await runParallel(
        remoteEntries,
        concurrency,
        async ({ entry, name, url, ref, subdir, pluginDir }) => {
          try {
            if (subdir) {
              console.log(styleText("cyan", `→ 正在从 ${url} 克隆 ${name}（子目录：${subdir})...`))
              fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
              const commit = await cloneWithSubdirAsync({ url, ref, subdir, pluginDir })
              lockfile.plugins[name] = {
                source: entry.source,
                resolved: url,
                commit,
                ...(ref && { ref }),
                subdir,
                installedAt: new Date().toISOString(),
              }
              installed.push({ name, pluginDir })
              lockfileChanged = true
              console.log(
                styleText("green", `✓ 已克隆 ${name}@${commit.slice(0, 7)}（子目录：${subdir}）`),
              )
            } else {
              console.log(styleText("cyan", `→ 正在从 ${url} 克隆 ${name}...`))

              const branchArg = ref ? ` --branch ${ref}` : ""
              await execAsync(`git clone --depth 1${branchArg} "${url}" "${pluginDir}"`)

              const { stdout } = await execAsync("git rev-parse HEAD", { cwd: pluginDir })
              const commit = stdout.trim()
              lockfile.plugins[name] = {
                source: entry.source,
                resolved: url,
                commit,
                ...(ref && { ref }),
                installedAt: new Date().toISOString(),
              }

              installed.push({ name, pluginDir })
              lockfileChanged = true
              console.log(styleText("green", `✓ 已克隆 ${name}@${commit.slice(0, 7)}`))
            }
          } catch (error) {
            console.log(
              styleText("red", `✗ 解析 ${formatSource(entry.source)} 失败：${error}`),
            )
            failed++
          }
        },
      )
    }

    if (installed.length > 0) {
      console.log()
      console.log(styleText("cyan", "→ 正在构建插件..."))
      const concurrency = resolvedConcurrency
      const results = await runParallel(installed, concurrency, async ({ name, pluginDir }) => {
        const ok = await buildPluginAsync(pluginDir, name)
        if (ok) console.log(styleText("green", `  ✓ ${name} 已构建`))
        return ok
      })
      for (const ok of results) {
        if (!ok) failed++
      }
      await regeneratePluginIndex()
    }

    if (orphans.length > 0) {
      console.log()
      let removedOrphans = false
      for (const name of orphans) {
        const entry = lockfile.plugins[name]
        if (entry?.commit === "local") {
          console.log(
            styleText(
              "yellow",
              `⚠ ${name} 是本地插件且不在配置中，已跳过（请使用 'plugin remove' 手动移除）`,
            ),
          )
          continue
        }
        const pluginDir = path.join(PLUGINS_DIR, name)
        if (fs.existsSync(pluginDir)) {
          fs.rmSync(pluginDir, { recursive: true })
        }
        delete lockfile.plugins[name]
        lockfileChanged = true
        removedOrphans = true
        console.log(styleText("yellow", `✗ 已移除 ${name}（不在配置中）`))
      }
      if (removedOrphans) {
        await regeneratePluginIndex()
      }
    }

    if (lockfileChanged) {
      writeLockfile(lockfile)
      console.log()
      if (failed === 0) {
        console.log(styleText("green", `✓ 已解析 ${installed.length} 个插件`))
      } else {
        console.log(
          styleText("yellow", `⚠ 已解析 ${installed.length} 个插件，${failed} 个失败`),
        )
      }
      console.log(styleText("gray", "已更新 quartz.lock.json"))
    } else if (failed > 0) {
      console.log()
      console.log(styleText("yellow", `⚠ 已解析 ${installed.length} 个插件，${failed} 个失败`))
    }

    return
  }

  if (dryRun) {
    const entries = Object.entries(lockfile.plugins).filter(([name]) =>
      nameFilter ? nameFilter.has(name) : true,
    )
    if (entries.length === 0) {
      console.log(styleText("gray", "尚未安装插件"))
      return
    }

    console.log(styleText("cyan", "→ 试运行：将从锁定文件安装以下插件..."))
    for (const [name, entry] of entries) {
      const sourceLabel = entry.source ? formatSource(entry.source) : entry.resolved
      const commitLabel = entry.commit === "local" ? "local" : entry.commit.slice(0, 7)
      console.log(`  ${styleText("yellow", name)} — ${sourceLabel} (${commitLabel})`)
    }
    return
  }

  if (clean) {
    console.log(styleText("cyan", "→ 正在从锁定文件恢复插件..."))
    console.log()

    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true })
    }

    let installed = 0
    let failed = 0
    const restoredPlugins = []

    const entries = Object.entries(lockfile.plugins).filter(([name]) =>
      nameFilter ? nameFilter.has(name) : true,
    )

    // Handle local symlinks and collect remote plugins to clone
    const remotePlugins = []
    for (const [name, entry] of entries) {
      const pluginDir = path.join(PLUGINS_DIR, name)

      if (fs.existsSync(pluginDir)) {
        console.log(styleText("yellow", `⚠ ${name}：目录已存在，已跳过`))
        continue
      }

      if (entry.commit === "local") {
        try {
          if (!fs.existsSync(entry.resolved)) {
            console.log(styleText("red", `  ✗ ${name}：本地路径缺失：${entry.resolved}`))
            failed++
            continue
          }
          fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
          symlinkOrCopySync(entry.resolved, pluginDir)
          console.log(styleText("green", `✓ ${name} 已恢复（本地符号链接）`))
          restoredPlugins.push({ name, pluginDir })
          installed++
        } catch {
          console.log(styleText("red", `✗ ${name}：恢复本地符号链接失败`))
          failed++
        }
        continue
      }

      remotePlugins.push({ name, entry, pluginDir })
    }

    // Clone remote plugins in parallel
    if (remotePlugins.length > 0) {
      const concurrency = resolvedConcurrency
      await runParallel(remotePlugins, concurrency, async ({ name, entry, pluginDir }) => {
        try {
          if (entry.subdir) {
            console.log(
              styleText(
                "cyan",
                `→ ${name}：正在克隆 ${entry.resolved}@${entry.commit.slice(0, 7)}（子目录：${entry.subdir})...`,
              ),
            )
            fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
            await cloneWithSubdirAsync({
              url: entry.resolved,
              ref: entry.ref,
              subdir: entry.subdir,
              pluginDir,
            })
          } else {
            console.log(
              styleText(
                "cyan",
                `→ ${name}：正在克隆 ${entry.resolved}@${entry.commit.slice(0, 7)}...`,
              ),
            )
            const branchArg = entry.ref ? ` --branch ${entry.ref}` : ""
            await execAsync(`git clone --depth 1${branchArg} "${entry.resolved}" "${pluginDir}"`)
            await execAsync(`git checkout ${entry.commit}`, { cwd: pluginDir })
          }
          console.log(styleText("green", `✓ ${name} 已恢复`))
          restoredPlugins.push({ name, pluginDir })
          installed++
        } catch {
          console.log(styleText("red", `✗ ${name}：恢复失败`))
          failed++
        }
      })
    }

    if (restoredPlugins.length > 0) {
      console.log()
      console.log(styleText("cyan", "→ 正在构建已恢复的插件..."))
      const concurrency = resolvedConcurrency
      const results = await runParallel(
        restoredPlugins,
        concurrency,
        async ({ name, pluginDir }) => {
          const ok = await buildPluginAsync(pluginDir, name)
          if (ok) console.log(styleText("green", `  ✓ ${name} 已构建`))
          return ok
        },
      )
      for (const ok of results) {
        if (!ok) {
          failed++
          installed--
        }
      }
      await regeneratePluginIndex()
    }

    console.log()
    if (failed === 0) {
      console.log(styleText("green", `✓ 已恢复 ${installed} 个插件`))
    } else {
      console.log(styleText("yellow", `⚠ 已恢复 ${installed} 个插件，${failed} 个失败`))
    }
    return
  }

  if (latest) {
    const pluginsToUpdate = nameFilter ? Array.from(nameFilter) : Object.keys(lockfile.plugins)
    const updatedPlugins = []
    let lockfileChanged = false

    // Phase 1: Validate and categorize plugins (fast, sequential)
    const validPlugins = []
    for (const name of pluginsToUpdate) {
      const entry = lockfile.plugins[name]
      if (!entry) {
        console.log(styleText("yellow", `⚠ ${name} 尚未安装`))
        continue
      }

      const pluginDir = path.join(PLUGINS_DIR, name)
      if (!fs.existsSync(pluginDir)) {
        console.log(
          styleText("yellow", `⚠ ${name} 目录缺失。请运行 'npx quartz plugin install'。`),
        )
        continue
      }

      if (entry.commit === "local") {
        console.log(styleText("cyan", `→ 正在重新构建本地插件 ${name}...`))
        updatedPlugins.push({ name, pluginDir })
        continue
      }

      validPlugins.push({ name, pluginDir, entry })
    }

    // Phase 2: Fetch/update plugins in parallel
    if (validPlugins.length > 0) {
      const concurrency = resolvedConcurrency
      await runParallel(validPlugins, concurrency, async ({ name, pluginDir, entry }) => {
        try {
          console.log(styleText("cyan", `→ 正在更新 ${name}...`))

          if (entry.subdir) {
            fs.rmSync(pluginDir, { recursive: true })
            fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
            const newCommit = await cloneWithSubdirAsync({
              url: entry.resolved,
              ref: entry.ref,
              subdir: entry.subdir,
              pluginDir,
            })
            if (needsBuild(pluginDir)) {
              updatedPlugins.push({ name, pluginDir })
            }
            if (newCommit !== entry.commit) {
              entry.commit = newCommit
              entry.installedAt = new Date().toISOString()
              lockfileChanged = true
              console.log(
                styleText(
                  "green",
                  `✓ 已将 ${name} 更新到 ${newCommit.slice(0, 7)}（子目录：${entry.subdir}）`,
                ),
              )
            } else {
              console.log(styleText("gray", `✓ ${name} 已重新构建（子目录：${entry.subdir}）`))
            }
          } else {
            const fetchRef = entry.ref || ""
            const resetTarget = entry.ref ? `origin/${entry.ref}` : "origin/HEAD"
            await execAsync(`git fetch --depth 1 origin${fetchRef ? " " + fetchRef : ""}`, {
              cwd: pluginDir,
            })
            await execAsync(`git reset --hard ${resetTarget}`, { cwd: pluginDir })

            const { stdout } = await execAsync("git rev-parse HEAD", { cwd: pluginDir })
            const newCommit = stdout.trim()
            if (newCommit !== entry.commit) {
              entry.commit = newCommit
              entry.installedAt = new Date().toISOString()
              updatedPlugins.push({ name, pluginDir })
              lockfileChanged = true
              console.log(styleText("green", `✓ 已将 ${name} 更新到 ${newCommit.slice(0, 7)}`))
            } else {
              console.log(styleText("gray", `✓ ${name} 已是最新`))
            }
          }
        } catch (error) {
          console.log(styleText("red", `✗ 更新 ${name} 失败：${error}`))
        }
      })
    }

    // Phase 3: Build updated plugins in parallel
    if (updatedPlugins.length > 0) {
      console.log()
      console.log(styleText("cyan", "→ 正在重新构建已更新的插件..."))
      const concurrency = resolvedConcurrency
      await runParallel(updatedPlugins, concurrency, async ({ name, pluginDir }) => {
        const ok = await buildPluginAsync(pluginDir, name)
        if (ok) console.log(styleText("green", `  ✓ ${name} 已重新构建`))
        return ok
      })
      await regeneratePluginIndex()
    }

    if (lockfileChanged) {
      writeLockfile(lockfile)
      console.log()
      console.log(styleText("gray", "已更新 quartz.lock.json"))
    }
    return
  }

  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true })
  }

  const entries = Object.entries(lockfile.plugins).filter(([name]) =>
    nameFilter ? nameFilter.has(name) : true,
  )
  if (entries.length === 0) {
    console.log(styleText("gray", "尚未安装插件"))
    return
  }

  console.log(styleText("cyan", "→ 正在从锁定文件安装插件..."))
  let installed = 0
  let failed = 0
  const pluginsToBuild = []

  // Handle local plugins and collect entries needing git operations
  const gitEntries = []
  for (const [name, entry] of entries) {
    const pluginDir = path.join(PLUGINS_DIR, name)

    if (entry.commit === "local") {
      try {
        if (fs.existsSync(pluginDir)) {
          const stat = fs.lstatSync(pluginDir)
          if (stat.isSymbolicLink() && fs.readlinkSync(pluginDir) === entry.resolved) {
            console.log(styleText("gray", `  ✓ ${name}（本地）已链接`))
            installed++
            continue
          }
          if (stat.isSymbolicLink()) fs.unlinkSync(pluginDir)
          else fs.rmSync(pluginDir, { recursive: true })
        }
        if (!fs.existsSync(entry.resolved)) {
          console.log(styleText("red", `  ✗ ${name}：本地路径缺失：${entry.resolved}`))
          failed++
          continue
        }
        fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
        symlinkOrCopySync(entry.resolved, pluginDir)
        console.log(styleText("green", `  ✓ ${name}（本地）已链接`))
        pluginsToBuild.push({ name, pluginDir })
        installed++
      } catch {
        console.log(styleText("red", `  ✗ ${name}：链接本地路径失败`))
        failed++
      }
      continue
    }

    if (fs.existsSync(pluginDir)) {
      if (entry.subdir) {
        if (!needsBuild(pluginDir)) {
          console.log(
            styleText("gray", `  ✓ ${name}@${entry.commit.slice(0, 7)} 已安装（子目录）`),
          )
          installed++
          continue
        }
        pluginsToBuild.push({ name, pluginDir })
        installed++
      } else {
        const currentCommit = getGitCommit(pluginDir)
        if (currentCommit === entry.commit && !needsBuild(pluginDir)) {
          console.log(
            styleText("gray", `  ✓ ${name}@${entry.commit.slice(0, 7)} 已安装`),
          )
          installed++
          continue
        }
        if (currentCommit !== entry.commit) {
          gitEntries.push({ name, entry, pluginDir, action: "update" })
        } else {
          pluginsToBuild.push({ name, pluginDir })
          installed++
        }
      }
    } else {
      gitEntries.push({ name, entry, pluginDir, action: "clone" })
    }
  }

  // Run git fetch/clone operations in parallel
  if (gitEntries.length > 0) {
    const concurrency = resolvedConcurrency
    await runParallel(gitEntries, concurrency, async ({ name, entry, pluginDir, action }) => {
      try {
        if (action === "update") {
          console.log(styleText("cyan", `  → ${name}：正在更新到 ${entry.commit.slice(0, 7)}...`))
          const fetchRef = entry.ref ? ` ${entry.ref}` : ""
          await execAsync(`git fetch --depth 1 origin${fetchRef}`, { cwd: pluginDir })
          await execAsync(`git reset --hard ${entry.commit}`, { cwd: pluginDir })
          pluginsToBuild.push({ name, pluginDir })
          installed++
        } else {
          if (entry.subdir) {
            console.log(styleText("cyan", `  → ${name}：正在克隆（子目录：${entry.subdir})...`))
            fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
            await cloneWithSubdirAsync({
              url: entry.resolved,
              ref: entry.ref,
              subdir: entry.subdir,
              pluginDir,
            })
          } else {
            console.log(styleText("cyan", `  → ${name}：正在克隆...`))
            const branchArg = entry.ref ? ` --branch ${entry.ref}` : ""
            await execAsync(`git clone --depth 1${branchArg} "${entry.resolved}" "${pluginDir}"`)
            if (entry.commit !== "unknown") {
              await execAsync(`git fetch --depth 1 origin ${entry.commit}`, { cwd: pluginDir })
              await execAsync(`git checkout ${entry.commit}`, { cwd: pluginDir })
            }
          }
          console.log(styleText("green", `  ✓ ${name}@${entry.commit.slice(0, 7)}`))
          pluginsToBuild.push({ name, pluginDir })
          installed++
        }
      } catch {
        console.log(
          styleText("red", `  ✗ ${name}: 无法${action === "update" ? "更新" : "克隆"}`),
        )
        failed++
      }
    })
  }

  if (pluginsToBuild.length > 0) {
    console.log()
    console.log(styleText("cyan", "→ 正在构建插件..."))
    const concurrency = resolvedConcurrency
    const results = await runParallel(pluginsToBuild, concurrency, async ({ name, pluginDir }) => {
      const ok = await buildPluginAsync(pluginDir, name)
      if (ok) console.log(styleText("green", `  ✓ ${name} 已构建`))
      return ok
    })
    for (const ok of results) {
      if (!ok) {
        failed++
        installed--
      }
    }
  }

  await regeneratePluginIndex()

  console.log()
  if (failed === 0) {
    console.log(styleText("green", `✓ 已安装 ${installed} 个插件`))
  } else {
    console.log(styleText("yellow", `⚠ 已安装 ${installed} 个插件，${failed} 个失败`))
  }
}

export async function handlePluginInstall() {
  return handlePluginInstallUnified()
}

export async function handlePluginAdd(
  sources,
  { name: nameOverride, subdir: subdirOverride, concurrency: concurrencyOption } = {},
) {
  if (nameOverride && sources.length > 1) {
    console.log(styleText("red", "✗ --name/--as 仅能在添加单个插件时使用"))
    return
  }
  if (subdirOverride && sources.length > 1) {
    console.log(styleText("red", "✗ --subdir 仅能在添加单个插件时使用"))
    return
  }

  const resolvedConcurrency = Math.max(1, concurrencyOption ?? os.cpus().length)

  let lockfile = readLockfile()
  if (!lockfile) {
    lockfile = { version: "1.0.0", plugins: {} }
  }

  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true })
  }

  const addedPlugins = []

  // Handle local plugins and collect remote sources to clone
  const remoteSources = []
  for (const source of sources) {
    try {
      const parsed = parseGitSource(source)
      if (parsed.npmPackage) {
        const name = nameOverride ?? parsed.name
        console.log(styleText("cyan", `→ 正在从 npm 安装 ${name}...`))
        execSync(`npm install ${parsed.name}`, { cwd: process.cwd(), stdio: "inherit" })
        const configSource = nameOverride ? { repo: parsed.name, name: nameOverride } : parsed.name
        const pluginDir = path.join(process.cwd(), "node_modules", ...parsed.name.split("/"))
        addedPlugins.push({ name, pluginDir, source: parsed.name, configSource })
        continue
      }
      const name = nameOverride ?? parsed.name
      const url = parsed.url
      const ref = parsed.ref
      const local = parsed.local
      const subdir = subdirOverride ?? parsed.subdir
      const pluginDir = path.join(PLUGINS_DIR, name)

      let configSource = undefined
      if (nameOverride || subdirOverride) {
        configSource = { repo: source }
        if (nameOverride) configSource.name = nameOverride
        if (subdirOverride) configSource.subdir = subdirOverride
      }

      if (fs.existsSync(pluginDir)) {
        console.log(styleText("yellow", `⚠ ${name} 已存在。请使用 'update' 刷新。`))
        continue
      }

      if (local) {
        let resolvedPath = path.resolve(url)
        if (subdir) resolvedPath = path.join(resolvedPath, subdir)
        if (!fs.existsSync(resolvedPath)) {
          console.log(styleText("red", `✗ 本地路径不存在：${resolvedPath}`))
          continue
        }
        console.log(styleText("cyan", `→ 正在从本地路径 ${resolvedPath} 添加 ${name}...`))
        fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
        symlinkOrCopySync(resolvedPath, pluginDir)
        lockfile.plugins[name] = {
          source,
          resolved: resolvedPath,
          commit: "local",
          ...(subdir && { subdir }),
          installedAt: new Date().toISOString(),
        }
        addedPlugins.push({ name, pluginDir, source, configSource })
        console.log(styleText("green", `✓ 已添加 ${name}（本地符号链接）`))
      } else {
        remoteSources.push({ source, name, url, ref, subdir, pluginDir, configSource })
      }
    } catch (error) {
      console.log(styleText("red", `✗ 添加 ${formatSource(source)} 失败：${error}`))
    }
  }

  // Clone remote plugins in parallel
  if (remoteSources.length > 0) {
    const concurrency = resolvedConcurrency
    await runParallel(
      remoteSources,
      concurrency,
      async ({ source, name, url, ref, subdir, pluginDir, configSource }) => {
        try {
          if (subdir) {
            console.log(styleText("cyan", `→ 正在从 ${url} 添加 ${name}（子目录：${subdir})...`))
            fs.mkdirSync(path.dirname(pluginDir), { recursive: true })
            const commit = await cloneWithSubdirAsync({ url, ref, subdir, pluginDir })
            lockfile.plugins[name] = {
              source,
              resolved: url,
              commit,
              ...(ref && { ref }),
              subdir,
              installedAt: new Date().toISOString(),
            }
            addedPlugins.push({ name, pluginDir, source, configSource })
            console.log(
              styleText("green", `✓ 已添加 ${name}@${commit.slice(0, 7)} (subdir: ${subdir})`),
            )
          } else {
            console.log(styleText("cyan", `→ 正在从 ${url} 添加 ${name}...`))

            const branchArg = ref ? ` --branch ${ref}` : ""
            await execAsync(`git clone --depth 1${branchArg} "${url}" "${pluginDir}"`)

            const { stdout } = await execAsync("git rev-parse HEAD", { cwd: pluginDir })
            const commit = stdout.trim()
            lockfile.plugins[name] = {
              source,
              resolved: url,
              commit,
              ...(ref && { ref }),
              installedAt: new Date().toISOString(),
            }

            addedPlugins.push({ name, pluginDir, source, configSource })
            console.log(styleText("green", `✓ 已添加 ${name}@${commit.slice(0, 7)}`))
          }
        } catch (error) {
          console.log(styleText("red", `✗ 添加 ${formatSource(source)} 失败：${error}`))
        }
      },
    )
  }

  if (addedPlugins.length > 0) {
    console.log()
    console.log(styleText("cyan", "→ 正在构建插件..."))
    const concurrency = resolvedConcurrency
    await runParallel(addedPlugins, concurrency, async ({ name, pluginDir }) => {
      const ok = await buildPluginAsync(pluginDir, name)
      if (ok) console.log(styleText("green", `  ✓ ${name} 已构建`))
      return ok
    })
    await regeneratePluginIndex()
  }

  writeLockfile(lockfile)
  const pluginsJson = readPluginsJson()
  if (pluginsJson?.plugins) {
    for (const { pluginDir, source, configSource } of addedPlugins) {
      const manifest = readManifestFromPackageJson(pluginDir)
      const newEntry = {
        source: configSource ?? source,
        enabled: manifest?.defaultEnabled ?? true,
        options: manifest?.defaultOptions ?? {},
        order: manifest?.defaultOrder ?? 50,
      }

      if (manifest?.components) {
        const layoutPositions = new Set(["left", "right", "beforeBody", "afterBody"])
        const firstComponentKey = Object.keys(manifest.components)[0]
        const comp = manifest.components[firstComponentKey]
        if (comp?.defaultPosition && layoutPositions.has(comp.defaultPosition)) {
          newEntry.layout = {
            position: comp.defaultPosition,
            priority: comp.defaultPriority ?? 50,
          }
        }
      }

      pluginsJson.plugins.push(newEntry)
    }
    writePluginsJson(pluginsJson)
  }
  console.log()
  console.log(styleText("gray", "已更新 quartz.lock.json"))
}

export async function handlePluginRemove(names) {
  const lockfile = readLockfile()
  if (!lockfile) {
    console.log(styleText("yellow", "⚠ 尚未安装插件"))
    return
  }

  const pluginsJson = readPluginsJson()
  let removed = false
  const resolvedNames = []
  for (const name of names) {
    const lockKey = resolveLockfileName(name, lockfile, pluginsJson)
    resolvedNames.push(lockKey)
    const pluginDir = path.join(PLUGINS_DIR, lockKey)

    if (!lockfile.plugins[lockKey] && !fs.existsSync(pluginDir)) {
      console.log(styleText("yellow", `⚠ ${name} 尚未安装`))
      continue
    }

    const displayName = lockKey !== name ? `${name} (${lockKey})` : name
    console.log(styleText("cyan", `→ 正在移除 ${displayName}...`))

    if (fs.existsSync(pluginDir)) {
      fs.rmSync(pluginDir, { recursive: true })
    }

    delete lockfile.plugins[lockKey]
    console.log(styleText("green", `✓ 已移除 ${displayName}`))
    removed = true
  }

  if (removed) {
    await regeneratePluginIndex()
  }

  writeLockfile(lockfile)
  if (pluginsJson?.plugins) {
    pluginsJson.plugins = pluginsJson.plugins.filter(
      (plugin) =>
        !names.includes(extractPluginName(plugin.source)) &&
        !names.includes(formatSource(plugin.source)) &&
        !resolvedNames.includes(extractPluginName(plugin.source)),
    )
    writePluginsJson(pluginsJson)
  }
  console.log()
  console.log(styleText("gray", "已更新 quartz.lock.json"))
}

export async function handlePluginEnable(names) {
  const json = readPluginsJson()
  if (!json) {
    console.log(styleText("red", "✗ 未找到 quartz.config.yaml，无法启用插件。"))
    return
  }

  for (const name of names) {
    const entry = json.plugins.find(
      (e) => extractPluginName(e.source) === name || formatSource(e.source) === name,
    )
    if (!entry) {
      console.log(styleText("yellow", `⚠ 在 quartz.config.yaml 中未找到插件 "${name}"`))
      continue
    }
    if (entry.enabled) {
      console.log(styleText("gray", `✓ ${name} 已经启用`))
      continue
    }
    entry.enabled = true
    console.log(styleText("green", `✓ 已启用 ${name}`))
  }

  writePluginsJson(json)
}

export async function handlePluginDisable(names) {
  const json = readPluginsJson()
  if (!json) {
    console.log(styleText("red", "✗ 未找到 quartz.config.yaml，无法禁用插件。"))
    return
  }

  for (const name of names) {
    const entry = json.plugins.find(
      (e) => extractPluginName(e.source) === name || formatSource(e.source) === name,
    )
    if (!entry) {
      console.log(styleText("yellow", `⚠ 在 quartz.config.yaml 中未找到插件 "${name}"`))
      continue
    }
    if (!entry.enabled) {
      console.log(styleText("gray", `✓ ${name} 已经禁用`))
      continue
    }
    entry.enabled = false
    console.log(styleText("green", `✓ 已禁用 ${name}`))
  }

  writePluginsJson(json)
}

export async function handlePluginConfig(name, options = {}) {
  const json = readPluginsJson()
  if (!json) {
    console.log(styleText("red", "✗ 未找到 quartz.config.yaml。"))
    return
  }

  const entry = json.plugins.find(
    (e) => extractPluginName(e.source) === name || formatSource(e.source) === name,
  )
  if (!entry) {
    console.log(styleText("red", `✗ 在 quartz.config.yaml 中未找到插件 "${name}"`))
    return
  }

  if (options.set) {
    const eqIndex = options.set.indexOf("=")
    if (eqIndex === -1) {
      console.log(styleText("red", "✗ 格式无效。请使用：--set key=value"))
      return
    }
    const key = options.set.slice(0, eqIndex)
    let value = options.set.slice(eqIndex + 1)

    try {
      value = JSON.parse(value)
    } catch {}

    if (!entry.options) entry.options = {}
    entry.options[key] = value
    writePluginsJson(json)
    console.log(styleText("green", `✓ 已设置 ${name}.${key} = ${JSON.stringify(value)}`))
  } else {
    console.log(styleText("bold", `插件：${name}`))
    console.log(`  来源：${formatSource(entry.source)}`)
    console.log(`  已启用：${entry.enabled}`)
    console.log(`  顺序：${entry.order ?? 50}`)
    if (entry.options && Object.keys(entry.options).length > 0) {
      console.log(`  选项：`)
      for (const [k, v] of Object.entries(entry.options)) {
        console.log(`    ${k}: ${JSON.stringify(v)}`)
      }
    } else {
      console.log(`  选项：（无）`)
    }
    if (entry.layout) {
      console.log(`  布局：`)
      for (const [k, v] of Object.entries(entry.layout)) {
        console.log(`    ${k}: ${JSON.stringify(v)}`)
      }
    }
  }
}

export async function handlePluginCheck() {
  return handlePluginInstallUnified({ latest: true, dryRun: true })
}

export async function handlePluginUpdate(names) {
  return handlePluginInstallUnified({ names, latest: true })
}

export async function handlePluginList() {
  const lockfile = readLockfile()
  if (!lockfile || Object.keys(lockfile.plugins).length === 0) {
    console.log(styleText("gray", "尚未安装插件"))
    return
  }

  const pluginsJson = readPluginsJson()
  const nameOverrides = getNameOverrides(lockfile, pluginsJson)

  console.log(styleText("bold", "已安装的插件："))
  console.log()

  for (const [name, entry] of Object.entries(lockfile.plugins)) {
    const pluginDir = path.join(PLUGINS_DIR, name)
    const exists = fs.existsSync(pluginDir)
    const overriddenName = nameOverrides.get(name)
    const displayLabel = overriddenName
      ? `${overriddenName} ${styleText("gray", `(dir: ${name})`)}`
      : name

    if (entry.commit === "local") {
      const isLinked = exists && fs.lstatSync(pluginDir).isSymbolicLink()
      const status = isLinked ? styleText("green", "✓") : styleText("red", "✗")
      console.log(`  ${status} ${styleText("bold", displayLabel)}`)
      console.log(`    来源：${formatSource(entry.source)}`)
      console.log(`    类型：本地符号链接`)
      console.log(`    目标：${entry.resolved}`)
      console.log(`    安装时间：${new Date(entry.installedAt).toLocaleDateString()}`)
      console.log()
      continue
    }

    let currentCommit = entry.commit

    if (exists) {
      currentCommit = getGitCommit(pluginDir)
    }

    const status = exists
      ? currentCommit === entry.commit
        ? styleText("green", "✓")
        : styleText("yellow", "⚡")
      : styleText("red", "✗")

    console.log(`  ${status} ${styleText("bold", displayLabel)}`)
    console.log(`    来源：${formatSource(entry.source)}`)
    console.log(`    提交：${entry.commit.slice(0, 7)}`)
    if (currentCommit !== entry.commit && exists) {
      console.log(`    当前：${currentCommit.slice(0, 7)}（已修改）`)
    }
    console.log(`    安装时间：${new Date(entry.installedAt).toLocaleDateString()}`)
    console.log()
  }
}

export async function handlePluginStatus() {
  const lockfile = readLockfile()
  if (!lockfile || Object.keys(lockfile.plugins).length === 0) {
    console.log(styleText("gray", "尚未安装插件"))
    return
  }

  const pluginsJson = readPluginsJson()
  const nameOverrides = getNameOverrides(lockfile, pluginsJson)
  const enabledByName = new Map(
    (pluginsJson?.plugins ?? []).map((entry) => [
      extractPluginName(entry.source),
      entry.enabled !== false,
    ]),
  )

  const rows = Object.entries(lockfile.plugins).map(([name, entry]) => {
    const pluginDir = path.join(PLUGINS_DIR, name)
    const exists = fs.existsSync(pluginDir)
    const displayName = nameOverrides.get(name) ?? name
    const sourceLabel = formatSource(entry.source)
    const commitLabel = entry.commit === "local" ? "local" : `@${entry.commit.slice(0, 7)}`
    const enabled = enabledByName.get(name) ?? false
    return { name, entry, exists, displayName, sourceLabel, commitLabel, enabled }
  })

  const nameWidth = Math.max(8, ...rows.map((row) => row.displayName.length)) + 2
  const sourceWidth = Math.max(8, ...rows.map((row) => row.sourceLabel.length)) + 2
  const commitWidth = Math.max(6, ...rows.map((row) => row.commitLabel.length)) + 2
  const enabledWidth = Math.max("enabled".length, "disabled".length) + 2
  const updateWidth =
    Math.max(
      "— local".length,
      "⋯".length,
      "✓ 已是最新".length,
      "↑ 有可用更新".length,
      "✗ 检查失败".length,
    ) + 2

  const formatRow = (row, updateLabel, updateText) => {
    const statusIcon = row.exists ? styleText("green", "✓") : styleText("red", "✗")
    const enabledText = row.enabled ? "enabled" : "disabled"
    const enabledLabel = row.enabled
      ? styleText("green", enabledText)
      : styleText("gray", enabledText)
    const enabledColumn = `${enabledLabel}${" ".repeat(enabledWidth - enabledText.length)}`
    const updateColumn = `${updateLabel}${" ".repeat(Math.max(0, updateWidth - updateText.length))}`
    return `  ${statusIcon} ${row.displayName.padEnd(nameWidth)}${row.sourceLabel.padEnd(
      sourceWidth,
    )}${row.commitLabel.padEnd(commitWidth)}${enabledColumn}${updateColumn}`
  }

  const updateDisplay = (status) => {
    switch (status) {
      case "local":
        return { text: "— local", label: styleText("gray", "— local") }
      case "up_to_date":
        return { text: "✓ 已是最新", label: styleText("green", "✓ 已是最新") }
      case "update_available":
        return { text: "↑ 有可用更新", label: styleText("yellow", "↑ 有可用更新") }
      case "failed":
        return { text: "✗ 检查失败", label: styleText("red", "✗ 检查失败") }
      default:
        return { text: "⋯", label: styleText("cyan", "⋯") }
    }
  }

  const isTTY = process.stdout.isTTY

  const updateLine = (index, updateLabel, updateText) => {
    if (!isTTY) return
    const offset = rows.length - index
    process.stdout.write(
      `\x1b[${offset}A\x1b[2K\r${formatRow(rows[index], updateLabel, updateText)}\x1b[${offset}B`,
    )
  }

  if (isTTY) {
    console.log(styleText("bold", "已安装的插件："))
    console.log()
    for (const row of rows) {
      const display =
        row.entry.commit === "local" ? updateDisplay("local") : updateDisplay("checking")
      console.log(formatRow(row, display.label, display.text))
    }
  }

  const promises = rows.map((row, index) => {
    if (row.entry.commit === "local") {
      return Promise.resolve({
        index,
        status: "local",
        name: row.displayName,
      })
    }

    const lsRemoteRef = row.entry.ref ? `refs/heads/${row.entry.ref}` : "HEAD"
    return execAsync(`git ls-remote "${row.entry.resolved}" ${lsRemoteRef}`)
      .then(({ stdout }) => {
        const latestCommit = stdout.split("\t")[0].trim()
        const status = latestCommit === row.entry.commit ? "up_to_date" : "update_available"
        const display = updateDisplay(status)
        updateLine(index, display.label, display.text)
        return { index, status, name: row.displayName }
      })
      .catch(() => {
        const display = updateDisplay("failed")
        updateLine(index, display.label, display.text)
        return { index, status: "failed", name: row.displayName }
      })
  })

  const results = await Promise.all(promises)
  const updatesAvailable = results
    .filter((result) => result.status === "update_available")
    .map((result) => result.name)
  const failedChecks = results
    .filter((result) => result.status === "failed")
    .map((result) => result.name)

  if (!isTTY) {
    console.log(styleText("bold", "已安装的插件："))
    console.log()
    for (const result of results) {
      const row = rows[result.index]
      const display = updateDisplay(result.status)
      console.log(formatRow(row, display.label, display.text))
    }
  }

  if (updatesAvailable.length === 0 && failedChecks.length === 0) {
    console.log(styleText("green", "\n✓ 所有插件均为最新"))
    return
  }

  if (updatesAvailable.length > 0) {
    console.log(styleText("yellow", `\n有可用更新：${updatesAvailable.join(", ")}`))
    console.log(styleText("gray", "运行 'npx quartz plugin install --latest' 进行更新。"))
  }

  if (failedChecks.length > 0) {
    console.log(styleText("red", `\n检查失败：${failedChecks.join(", ")}`))
  }
}

export async function handlePluginRestore() {
  return handlePluginInstallUnified({ clean: true })
}

export async function handlePluginPrune({ dryRun = false } = {}) {
  const lockfile = readLockfile()
  if (!lockfile || Object.keys(lockfile.plugins).length === 0) {
    console.log(styleText("gray", "尚未安装插件"))
    return
  }

  const pluginsJson = readPluginsJson()
  const configuredNames = new Set(
    (pluginsJson?.plugins ?? []).map((entry) => extractPluginName(entry.source)),
  )

  const orphans = Object.keys(lockfile.plugins).filter((name) => !configuredNames.has(name))

  if (orphans.length === 0) {
    console.log(styleText("green", "✓ 未发现孤立插件，无需清理"))
    return
  }

  console.log(`发现 ${orphans.length} 个孤立插件：\n`)
  for (const name of orphans) {
    console.log(`  ${styleText("yellow", name)} — 存在于锁定文件但不在配置中`)
  }
  console.log()

  if (dryRun) {
    console.log(styleText("cyan", "试运行，未做任何更改。去掉 --dry-run 后重新运行即可清理。"))
    return
  }

  let removed = 0
  for (const name of orphans) {
    const pluginDir = path.join(PLUGINS_DIR, name)

    console.log(styleText("cyan", `→ 正在移除 ${name}...`))

    if (fs.existsSync(pluginDir)) {
      fs.rmSync(pluginDir, { recursive: true })
    }

    delete lockfile.plugins[name]
    console.log(styleText("green", `✓ 已移除 ${name}`))
    removed++
  }

  if (removed > 0) {
    await regeneratePluginIndex()
  }

  writeLockfile(lockfile)
  console.log()
  console.log(styleText("green", `✓ 已清理 ${removed} 个插件`))
  console.log(styleText("gray", "已更新 quartz.lock.json"))
}

export async function handlePluginResolve({ dryRun = false } = {}) {
  return handlePluginInstallUnified({ fromConfig: true, dryRun })
}
