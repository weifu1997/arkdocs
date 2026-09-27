import { promises } from "fs"
import path from "path"
import esbuild from "esbuild"
import { styleText } from "util"
import { sassPlugin } from "esbuild-sass-plugin"
import fs from "fs"
import { intro, outro, select, text } from "@clack/prompts"
import { rm } from "fs/promises"
import chokidar from "chokidar"
import prettyBytes from "pretty-bytes"
import { execSync, spawnSync } from "child_process"
import http from "http"
import serveHandler from "serve-handler"
import { WebSocketServer } from "ws"
import { randomUUID } from "crypto"
import { Mutex } from "async-mutex"
import { CreateArgv } from "./args.js"
import { globby } from "globby"
import {
  exitIfCancel,
  escapePath,
  gitPull,
  popContentFolder,
  stashContentFolder,
  symlinkOrCopy,
} from "./helpers.js"
import {
  handlePluginRestore,
  handlePluginCheck,
  handlePluginResolve,
} from "./plugin-git-handlers.js"
import {
  configExists,
  createConfigFromDefault,
  createConfigFromTemplate,
  readPluginsJson,
  writePluginsJson,
  extractPluginName,
  updateGlobalConfig,
  LOCKFILE_PATH,
} from "./plugin-data.js"
import {
  UPSTREAM_NAME,
  QUARTZ_SOURCE_BRANCH,
  QUARTZ_SOURCE_REPO,
  ORIGIN_NAME,
  version,
  fp,
  cacheFile,
  cwd,
} from "./constants.js"

/**
 * Resolve content directory path
 * @param contentPath path to resolve
 */
function resolveContentPath(contentPath) {
  if (path.isAbsolute(contentPath)) return path.relative(cwd, contentPath)
  return path.join(cwd, contentPath)
}

/**
 * Handles `npx quartz create`
 * @param {*} argv arguments for `create`
 */
export async function handleCreate(argv) {
  console.log()
  intro(styleText(["bgGreen", "black"], ` Quartz v${version} `))
  const contentFolder = resolveContentPath(argv.directory)
  let setupStrategy = argv.strategy?.toLowerCase()
  let linkResolutionStrategy = argv.links?.toLowerCase()
  const sourceDirectory = argv.source
  let template = argv.template?.toLowerCase()
  let baseUrl = argv.baseUrl

  // If all cmd arguments were provided, check if they're valid
  if (setupStrategy && linkResolutionStrategy) {
    // If setup isn't, "new", source argument is required
    if (setupStrategy !== "new") {
      // Error handling
      if (!sourceDirectory) {
        outro(
          styleText(
            "red",
            `除 '${styleText(
              "yellow",
              "new",
            )}' 以外的初始化策略（参数 '${styleText(
              "yellow",
              `-${CreateArgv.strategy.alias[0]}`,
            )}'）都需要设置内容目录参数（'${styleText(
              "yellow",
              `-${CreateArgv.source.alias[0]}`,
            )}'）`,
          ),
        )
        process.exit(1)
      } else {
        if (!fs.existsSync(sourceDirectory)) {
          outro(
            styleText(
              "red",
              `未找到用于复制或创建符号链接的源目录（'${styleText(
                "yellow",
                sourceDirectory,
              )}'，参数 "${styleText("yellow", `-${CreateArgv.source.alias[0]}`)}" 无效）`,
            ),
          )
          process.exit(1)
        } else if (!fs.lstatSync(sourceDirectory).isDirectory()) {
          outro(
            styleText(
              "red",
              `用于复制或创建符号链接的源路径不是目录（在 '${styleText(
                "yellow",
                sourceDirectory,
              )}' 找到的是文件，参数 ${styleText("yellow", `-${CreateArgv.source.alias[0]}`)} 无效）`,
            ),
          )
          process.exit(1)
        }
      }
    }
  }

  // Template selection
  if (!template) {
    template = exitIfCancel(
      await select({
        message: "选择 Quartz 配置模板",
        options: [
          { value: "default", label: "默认", hint: "简洁的 Quartz 配置，采用合理默认值" },
          {
            value: "obsidian",
            label: "Obsidian",
            hint: "针对 Obsidian 仓库优化，完整支持 OFM",
          },
          {
            value: "ttrpg",
            label: "TTRPG",
            hint: "Obsidian + 地图插件 + ITS 主题，适合 D&D/TTRPG 维基",
          },
          {
            value: "blog",
            label: "博客",
            hint: "启用最近笔记和评论，适合博客站点",
          },
        ],
      }),
    )
  }
  // Use cli process if cmd args werent provided
  if (!setupStrategy) {
    setupStrategy = exitIfCancel(
      await select({
        message: `选择如何初始化 \`${contentFolder}\` 中的内容`,
        options: [
          { value: "new", label: "空白 Quartz" },
          { value: "copy", label: "复制已有文件夹", hint: "会覆盖 `content`" },
          {
            value: "symlink",
            label: "为已有文件夹创建符号链接",
            hint: "除非你清楚自己在做什么，否则不要选择此项",
          },
        ],
      }),
    )
  }

  async function rmContentFolder() {
    const contentStat = await fs.promises.lstat(contentFolder)
    if (contentStat.isSymbolicLink()) {
      await fs.promises.unlink(contentFolder)
    } else {
      await rm(contentFolder, { recursive: true, force: true })
    }
  }

  const gitkeepPath = path.join(contentFolder, ".gitkeep")
  if (fs.existsSync(gitkeepPath)) {
    await fs.promises.unlink(gitkeepPath)
  }
  if (setupStrategy === "copy" || setupStrategy === "symlink") {
    let originalFolder = sourceDirectory

    // If input directory was not passed, use cli
    if (!sourceDirectory) {
      originalFolder = escapePath(
        exitIfCancel(
          await text({
            message: "输入已有内容文件夹的完整路径",
            placeholder:
              "在大多数终端中，可以把文件夹拖进窗口，即可粘贴完整路径",
            validate(fp) {
              const fullPath = escapePath(fp)
              if (!fs.existsSync(fullPath)) {
                return "给定路径不存在"
              } else if (!fs.lstatSync(fullPath).isDirectory()) {
                return "给定路径不是文件夹"
              }
            },
          }),
        ),
      )
    }

    await rmContentFolder()
    if (setupStrategy === "copy") {
      await fs.promises.cp(originalFolder, contentFolder, {
        recursive: true,
        preserveTimestamps: true,
      })
    } else if (setupStrategy === "symlink") {
      await symlinkOrCopy(originalFolder, contentFolder)
    }
  } else if (setupStrategy === "new") {
    await fs.promises.writeFile(
      path.join(contentFolder, "index.md"),
      `---
title: 欢迎使用 Quartz
---

这是一份空白的 Quartz 站点。
请参阅[文档](https://quartz.jzhao.xyz)了解如何开始。
`,
    )
  }

  // Obsidian and TTRPG templates auto-set link resolution to "shortest"
  const skipLinkPrompt = template === "obsidian" || template === "ttrpg"
  if (skipLinkPrompt) {
    linkResolutionStrategy = "shortest"
  }

  // Use cli process if cmd args werent provided
  if (!linkResolutionStrategy) {
    // get a preferred link resolution strategy
    linkResolutionStrategy = exitIfCancel(
      await select({
        message: `选择 Quartz 解析内容链接的方式。这应与 Obsidian 的链接格式一致。之后可以在 \`quartz.config.yaml\` 中修改。`,
        options: [
          {
            value: "shortest",
            label: "按最短路径解析链接",
            hint: "（默认）",
          },
          {
            value: "absolute",
            label: "按绝对路径解析链接",
          },
          {
            value: "relative",
            label: "按相对路径解析链接",
          },
        ],
      }),
    )
  }

  // Base URL prompt
  if (!baseUrl) {
    baseUrl = exitIfCancel(
      await text({
        message: "输入 Quartz 站点的基础 URL（例如 mysite.github.io/quartz）",
        placeholder: "mysite.github.io",
        validate(value) {
          if (!value || value.trim().length === 0) {
            return "基础 URL 不能为空"
          }
        },
      }),
    )
  }

  // Strip protocol prefix if user included it
  baseUrl = baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")

  if (template && template !== "default") {
    createConfigFromTemplate(template)
    console.log(styleText("green", `已根据 '${template}' 模板创建 quartz.config.yaml`))
  } else {
    createConfigFromTemplate("default")
    console.log(styleText("green", "已根据默认配置创建 quartz.config.yaml"))
  }

  // Update markdownLinkResolution in the crawl-links plugin options via YAML config
  const json = readPluginsJson()
  if (json?.plugins) {
    const crawlLinksIndex = json.plugins.findIndex(
      (p) => extractPluginName(p.source) === "crawl-links",
    )
    if (crawlLinksIndex !== -1) {
      json.plugins[crawlLinksIndex].options = {
        ...json.plugins[crawlLinksIndex].options,
        markdownLinkResolution: linkResolutionStrategy,
      }
      writePluginsJson(json)
    }
  }

  // Update baseUrl in configuration
  updateGlobalConfig({ baseUrl })

  // install plugins referenced in the template config
  await handlePluginResolve()

  // setup remote
  execSync(`git remote show upstream || git remote add upstream ${QUARTZ_SOURCE_REPO}`, {
    stdio: "ignore",
  })

  outro(`一切就绪！接下来可以试试：
  • 编辑 \`quartz.config.yaml\`，进一步自定义 Quartz
  • 运行 \`npx quartz build --serve\` 在本地预览站点
  • 将 Quartz 部署到线上（参见：https://quartz.jzhao.xyz/hosting）
`)
}

/**
 * Handles `npx quartz build`
 * @param {*} argv arguments for `build`
 */
export async function handleBuild(argv) {
  if (argv.concurrency !== undefined && argv.concurrency < 1) {
    console.error("并发数至少为 1")
    process.exit(1)
  }

  if (argv.serve) {
    argv.watch = true
  }

  console.log(`\n${styleText(["bgGreen", "black"], ` Quartz v${version} `)} \n`)
  const ctx = await esbuild.context({
    entryPoints: [fp],
    outfile: cacheFile,
    bundle: true,
    keepNames: true,
    minifyWhitespace: true,
    minifySyntax: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "preact",
    packages: "external",
    metafile: true,
    sourcemap: true,
    sourcesContent: false,
    logOverride: {
      "direct-eval": "silent",
      "equals-negative-zero": "silent",
      "duplicate-object-key": "silent",
    },
    plugins: [
      sassPlugin({
        type: "css-text",
        cssImports: true,
      }),
      sassPlugin({
        filter: /\.inline\.scss$/,
        type: "css",
        cssImports: true,
      }),
      {
        name: "inline-script-loader",
        setup(build) {
          build.onLoad({ filter: /\.inline\.(ts|js)$/ }, async (args) => {
            let text = await promises.readFile(args.path, "utf8")

            // remove default exports that we manually inserted
            text = text.replace("export default", "")
            text = text.replace("export", "")

            const sourcefile = path.relative(path.resolve("."), args.path)
            const resolveDir = path.dirname(sourcefile)
            const transpiled = await esbuild.build({
              stdin: {
                contents: text,
                loader: "ts",
                resolveDir,
                sourcefile,
              },
              write: false,
              bundle: true,
              minify: true,
              platform: "browser",
              format: "esm",
            })
            const rawMod = transpiled.outputFiles[0].text
            return {
              contents: rawMod,
              loader: "text",
            }
          })
        },
      },
    ],
  })

  const buildMutex = new Mutex()
  let lastBuildMs = 0
  let cleanupBuild = null
  const build = async (clientRefresh) => {
    const buildStart = new Date().getTime()
    lastBuildMs = buildStart
    const release = await buildMutex.acquire()
    if (lastBuildMs > buildStart) {
      release()
      return
    }

    if (cleanupBuild) {
      console.log(styleText("yellow", "检测到源代码变更，正在进行完整重新构建..."))
      await cleanupBuild()
    }

    const result = await ctx.rebuild().catch((err) => {
      console.error(
        `${styleText("red", "Quartz 构建失败。")} 请检查配置或插件中是否存在语法错误。`,
      )
      console.log(`原因：${styleText("gray", err.message ?? String(err))}`)
      process.exit(1)
    })
    release()

    if (argv.bundleInfo) {
      const outputFileName = "quartz/.quartz-cache/transpiled-build.mjs"
      const meta = result.metafile.outputs[outputFileName]
      console.log(
        `已成功转译 ${Object.keys(meta.inputs).length} 个文件（${prettyBytes(
          meta.bytes,
        )}）`,
      )
      console.log(await esbuild.analyzeMetafile(result.metafile, { color: true }))
    }

    // bypass module cache
    // https://github.com/nodejs/modules/issues/307
    const { default: buildQuartz } = await import(`../../${cacheFile}?update=${randomUUID()}`)
    // ^ this import is relative, so base "cacheFile" path can't be used

    cleanupBuild = await buildQuartz(argv, buildMutex, clientRefresh)
    clientRefresh()
  }

  let clientRefresh = () => {}
  if (argv.serve) {
    const connections = []
    clientRefresh = () => connections.forEach((conn) => conn.send("rebuild"))

    if (argv.baseDir !== "" && !argv.baseDir.startsWith("/")) {
      argv.baseDir = "/" + argv.baseDir
    }

    await build(clientRefresh)
    const server = http.createServer(async (req, res) => {
      if (argv.baseDir && !req.url?.startsWith(argv.baseDir)) {
        console.log(
          styleText(
            "red",
            `[404] ${req.url}（警告：链接指向站点外部，这很可能是 Quartz 的问题）`,
          ),
        )
        res.writeHead(404)
        res.end()
        return
      }

      // strip baseDir prefix
      req.url = req.url?.slice(argv.baseDir.length)

      const serve = async () => {
        const release = await buildMutex.acquire()
        await serveHandler(req, res, {
          public: argv.output,
          directoryListing: false,
          headers: [
            {
              source: "**/*.*",
              headers: [{ key: "Content-Disposition", value: "inline" }],
            },
            {
              source: "**/*.webp",
              headers: [{ key: "Content-Type", value: "image/webp" }],
            },
            // fixes bug where avif images are displayed as text instead of images (future proof)
            {
              source: "**/*.avif",
              headers: [{ key: "Content-Type", value: "image/avif" }],
            },
          ],
        })
        const status = res.statusCode
        const statusString =
          status >= 200 && status < 300
            ? styleText("green", `[${status}]`)
            : styleText("red", `[${status}]`)
        console.log(statusString + styleText("gray", ` ${argv.baseDir}${req.url}`))
        release()
      }

      const redirect = (newFp) => {
        newFp = argv.baseDir + newFp
        res.writeHead(302, {
          Location: newFp,
        })
        console.log(
          styleText("yellow", "[302]") +
            styleText("gray", ` ${argv.baseDir}${req.url} -> ${newFp}`),
        )
        res.end()
      }

      let fp = req.url?.split("?")[0] ?? "/"

      // handle redirects
      if (fp.endsWith("/")) {
        // /trailing/
        // does /trailing/index.html exist? if so, serve it
        const indexFp = path.posix.join(fp, "index.html")
        if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
          req.url = fp
          return serve()
        }

        // does /trailing.html exist? if so, redirect to /trailing
        let base = fp.slice(0, -1)
        if (path.extname(base) === "") {
          base += ".html"
        }
        if (fs.existsSync(path.posix.join(argv.output, base))) {
          return redirect(fp.slice(0, -1))
        }
      } else {
        // /regular
        // does /regular.html exist? if so, serve it
        let base = fp
        if (path.extname(base) === "") {
          base += ".html"
        }
        if (fs.existsSync(path.posix.join(argv.output, base))) {
          req.url = fp
          return serve()
        }

        // does /regular/index.html exist? if so, redirect to /regular/
        let indexFp = path.posix.join(fp, "index.html")
        if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
          return redirect(fp + "/")
        }
      }

      return serve()
    })

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `端口 ${argv.port} 已被占用。请使用 --port <number> 指定其他端口`,
        )
        process.exit(1)
      }
      throw err
    })
    server.listen(argv.port)
    const wss = new WebSocketServer({ port: argv.wsPort })
    wss.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `WebSocket 端口 ${argv.wsPort} 已被占用。请使用 --wsPort <number> 指定其他端口`,
        )
        process.exit(1)
      }
      throw err
    })
    wss.on("connection", (ws) => connections.push(ws))
    console.log(
      styleText(
        "cyan",
        `已启动 Quartz 服务器，监听地址为 http://localhost:${argv.port}${argv.baseDir}`,
      ),
    )
  } else {
    await build(clientRefresh)
    ctx.dispose()
  }

  if (argv.watch) {
    const paths = await globby([
      "**/*.ts",
      "quartz/cli/*.js",
      "quartz/static/**/*",
      "**/*.tsx",
      "**/*.scss",
      "package.json",
      "quartz.config.yaml",
      "quartz.config.default.yaml",
    ])
    chokidar
      .watch(paths, { ignoreInitial: true })
      .on("add", () => build(clientRefresh))
      .on("change", () => build(clientRefresh))
      .on("unlink", () => build(clientRefresh))

    console.log(styleText("gray", "提示：按 ctrl+c 退出"))
  }
}

/**
 * Handles `npx quartz upgrade`
 * Upgrades the Quartz framework itself by pulling latest changes from upstream.
 * @param {*} argv arguments for `upgrade`
 */
export async function handleUpgrade(argv) {
  const contentFolder = resolveContentPath(argv.directory)
  console.log(`\n${styleText(["bgGreen", "black"], ` Quartz v${version} `)} \n`)
  console.log("正在备份内容")
  execSync(`git remote show upstream || git remote add upstream ${QUARTZ_SOURCE_REPO}`)
  await stashContentFolder(contentFolder)

  const lockfileBackup = LOCKFILE_PATH + ".bak"
  const hasLockfile = fs.existsSync(LOCKFILE_PATH)
  if (hasLockfile) {
    fs.copyFileSync(LOCKFILE_PATH, lockfileBackup)
  }

  console.log(
    "正在拉取更新……如果你修改过组件或插件，可能需要解决一些 git 冲突。",
  )

  let pullOk = false
  try {
    gitPull(UPSTREAM_NAME, QUARTZ_SOURCE_BRANCH)
    pullOk = true
  } catch {
    if (hasLockfile) {
      try {
        fs.copyFileSync(lockfileBackup, LOCKFILE_PATH)
        execSync(`git add ${LOCKFILE_PATH}`)
        const remaining = execSync("git diff --name-only --diff-filter=U", {
          encoding: "utf-8",
        }).trim()
        if (remaining.length === 0) {
          execSync("git commit --no-edit")
          pullOk = true
          console.log(styleText("cyan", "已自动解决 quartz.lock.json 的合并冲突。"))
        }
      } catch {
        // Could not auto-resolve, fall through to manual resolution
      }
    }

    if (!pullOk) {
      console.log(
        styleText("red", "拉取更新时出错。") +
          "\n请检查网络连接和 git 凭据。如果出现合并冲突，请手动解决后运行 `npx quartz sync --no-pull`。",
      )
      await popContentFolder(contentFolder)
      if (fs.existsSync(lockfileBackup)) fs.unlinkSync(lockfileBackup)
      return
    }
  }

  if (hasLockfile && fs.existsSync(lockfileBackup)) {
    fs.copyFileSync(lockfileBackup, LOCKFILE_PATH)
    fs.unlinkSync(lockfileBackup)
  }

  await popContentFolder(contentFolder)

  // Read the new version after pulling
  const newPkg = JSON.parse(fs.readFileSync("./package.json").toString())
  const newVersion = newPkg.version
  if (newVersion !== version) {
    console.log(styleText("cyan", `已将 Quartz 升级：v${version} → v${newVersion}`))
  } else {
    console.log(styleText("gray", `Quartz 已是最新版本（v${version}）`))
  }

  console.log("正在确保依赖为最新")

  /*
  On Windows, if the command `npm` is really `npm.cmd', this call fails
  as it will be unable to find `npm`. This is often the case on systems
  where `npm` is installed via a package manager.

  This means `npx quartz upgrade` will not actually update dependencies
  on Windows, without a manual `npm i` from the caller.

  However, by spawning a shell, we are able to call `npm.cmd`.
  See: https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows
  */

  const opts = { stdio: "inherit" }
  if (process.platform === "win32") {
    opts.shell = true
  }

  const res = spawnSync("npm", ["i"], opts)
  if (res.status === 0) {
    console.log(styleText("green", "依赖已更新！"))
  } else {
    console.log(
      styleText("red", "安装依赖时出错。") +
        "\n请手动运行 `npm install` 查看详细错误。",
    )
  }

  console.log("正在从锁定文件恢复插件...")
  await handlePluginRestore()

  console.log("正在检查插件兼容性...")
  await handlePluginCheck()

  console.log(styleText("green", "完成！"))
}

/**
 * Handles `npx quartz restore`
 * @param {*} argv arguments for `restore`
 */
export async function handleRestore(argv) {
  const contentFolder = resolveContentPath(argv.directory)
  await popContentFolder(contentFolder)
}

/**
 * Handles `npx quartz sync`
 * @param {*} argv arguments for `sync`
 */
export async function handleSync(argv) {
  const contentFolder = resolveContentPath(argv.directory)
  console.log(`\n${styleText(["bgGreen", "black"], ` Quartz v${version} `)}\n`)
  console.log("正在备份内容")

  if (argv.commit) {
    const contentStat = await fs.promises.lstat(contentFolder)
    if (contentStat.isSymbolicLink()) {
      const linkTarg = await fs.promises.readlink(contentFolder)
      console.log(styleText("yellow", "检测到符号链接，提交前将先解析为实际内容"))

      // stash symlink file
      await stashContentFolder(contentFolder)

      // follow symlink and copy content
      await fs.promises.cp(linkTarg, contentFolder, {
        recursive: true,
        preserveTimestamps: true,
      })
    }

    const currentTimestamp = new Date().toLocaleString("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    const commitMessage = argv.message ?? `Quartz 同步：${currentTimestamp}`
    spawnSync("git", ["add", "."], { stdio: "inherit" })
    spawnSync("git", ["commit", "-m", commitMessage], { stdio: "inherit" })

    if (contentStat.isSymbolicLink()) {
      // put symlink back
      await popContentFolder(contentFolder)
    }
  }

  await stashContentFolder(contentFolder)

  if (argv.pull) {
    console.log(
      "正在从仓库拉取更新。如果你修改过组件或插件，可能需要解决一些 git 冲突。",
    )
    try {
      gitPull(ORIGIN_NAME, QUARTZ_SOURCE_BRANCH)
    } catch {
      console.log(
        styleText("red", "从仓库拉取更新时出错。") +
          "\n请检查网络连接和 git 凭据。",
      )
      await popContentFolder(contentFolder)
      return
    }
  }

  await popContentFolder(contentFolder)
  if (argv.push) {
    console.log("正在推送更改")
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim()
    const res = spawnSync("git", ["push", "-uf", ORIGIN_NAME, currentBranch], {
      stdio: "inherit",
    })
    if (res.status !== 0) {
      console.log(
        styleText("red", `推送到远程 ${ORIGIN_NAME} 时出错。`) +
          "\n请确认你对该远程仓库拥有推送权限。",
      )
      return
    }
  }

  console.log(styleText("green", "完成！"))
}
