#!/usr/bin/env -S node --no-deprecation
const [major] = process.versions.node.split(".").map(Number)
if (major < 22) {
  console.error(
    `\nQuartz 需要 Node.js >= 22，当前版本为 Node.js ${process.version}。\n` +
      `请升级：https://nodejs.org/\n`,
  )
  process.exit(1)
}
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import {
  handleBuild,
  handleCreate,
  handleUpgrade,
  handleRestore,
  handleSync,
} from "./cli/handlers.js"

import {
  handlePluginInstallUnified,
  handlePluginAdd,
  handlePluginRemove,
  handlePluginList,
  handlePluginStatus,
  handlePluginEnable,
  handlePluginDisable,
  handlePluginConfig,
  handlePluginPrune,
} from "./cli/plugin-git-handlers.js"
import { CommonArgv, BuildArgv, CreateArgv, SyncArgv } from "./cli/args.js"
import { version } from "./cli/constants.js"

async function launchTui() {
  const { join } = await import("path")
  const { existsSync } = await import("fs")
  const { spawn } = await import("child_process")
  const tuiPath = join(process.cwd(), ".quartz", "plugins", "tui", "dist", "App.mjs")

  if (!existsSync(tuiPath)) {
    console.error(
      "尚未安装 TUI 插件。请执行：\n" +
        "  npx quartz plugin add @quartz-community/tui\n",
    )
    process.exit(1)
  }

  // OpenTUI requires Bun runtime (uses bun:ffi for Zig renderer)
  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", tuiPath], {
      stdio: "inherit",
      cwd: process.cwd(),
    })

    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        console.error(
          "错误：未找到 Bun 运行时。TUI 需要 Bun 才能运行。\n" +
            "安装 Bun：https://bun.sh/docs/installation",
        )
      }
      reject(err)
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`TUI 以退出码 ${code} 结束`))
      }
    })
  })
}

yargs(hideBin(process.argv))
  .scriptName("quartz")
  .version(version)
  .usage("$0 <cmd> [args]")
  .command("create", "初始化 Quartz", CreateArgv, async (argv) => {
    await handleCreate(argv)
  })
  .command(
    ["upgrade", "update"],
    "将 Quartz 升级到最新版本",
    CommonArgv,
    async (argv) => {
      await handleUpgrade(argv)
    },
  )
  .command(
    "restore",
    "尝试从缓存恢复内容目录",
    CommonArgv,
    async (argv) => {
      await handleRestore(argv)
    },
  )
  .command("sync", "在本地与 GitHub 之间同步 Quartz", SyncArgv, async (argv) => {
    await handleSync(argv)
  })
  .command("build", "将 Quartz 构建为静态 HTML 文件", BuildArgv, async (argv) => {
    await handleBuild(argv)
  })
  .command("tui", "启动交互式插件管理器", CommonArgv, async () => {
    await launchTui()
  })
  .command(
    "plugin [subcommand]",
    "管理 Quartz 插件",
    (yargs) => {
      return (
        yargs
          .command(
            "install [names..]",
            "从锁定文件或配置安装插件",
            {
              ...CommonArgv,
              "from-config": {
                boolean: true,
                default: false,
                describe: "安装 quartz.config.yaml 中引用的插件，而不是锁定文件中的插件",
              },
              latest: {
                boolean: true,
                default: false,
                describe: "从远程获取最新版本，而不是锁定文件中固定的提交",
              },
              clean: {
                boolean: true,
                default: false,
                describe: "跳过目录已存在的插件",
              },
              "dry-run": {
                boolean: true,
                default: false,
                describe: "仅显示将要执行的操作，不实际修改",
              },
            },
            async (argv) => {
              await handlePluginInstallUnified({
                names: argv.names?.length ? argv.names : undefined,
                fromConfig: argv.fromConfig,
                latest: argv.latest,
                clean: argv.clean,
                dryRun: argv.dryRun,
                concurrency: argv.concurrency,
              })
            },
          )
          .command(
            "add <repos..>",
            "从 Git 仓库添加插件",
            {
              ...CommonArgv,
              name: {
                string: true,
                alias: ["as"],
                describe: "覆盖插件名称（用于解决重名冲突）",
              },
              subdir: {
                string: true,
                describe: "仓库中包含插件的子目录",
              },
            },
            async (argv) => {
              await handlePluginAdd(argv.repos, {
                name: argv.name,
                subdir: argv.subdir,
                concurrency: argv.concurrency,
              })
            },
          )
          .command("remove <names..>", "移除已安装的插件", CommonArgv, async (argv) => {
            await handlePluginRemove(argv.names)
          })
          .command("list", "列出所有已安装的插件", CommonArgv, async () => {
            await handlePluginList()
          })
          .command(
            "enable <names..>",
            "在 quartz.config.yaml 中启用插件",
            CommonArgv,
            async (argv) => {
              await handlePluginEnable(argv.names)
            },
          )
          .command(
            "disable <names..>",
            "在 quartz.config.yaml 中禁用插件",
            CommonArgv,
            async (argv) => {
              await handlePluginDisable(argv.names)
            },
          )
          .command(
            "config <name>",
            "查看或设置插件配置",
            {
              ...CommonArgv,
              set: {
                string: true,
                describe: "设置配置项（key=value）",
              },
            },
            async (argv) => {
              await handlePluginConfig(argv.name, { set: argv.set })
            },
          )
          .command(
            "prune",
            "移除配置中不再引用的已安装插件",
            {
              ...CommonArgv,
              "dry-run": {
                boolean: true,
                default: false,
                describe: "仅显示将要清理的内容，不实际修改",
              },
            },
            async (argv) => {
              await handlePluginPrune({ dryRun: argv.dryRun })
            },
          )
          // Hidden deprecated aliases
          .command("restore", false, CommonArgv, async (argv) => {
            console.log(
              "\x1b[33m⚠ 'plugin restore' 已弃用。请改用 'plugin install --clean'。\x1b[0m",
            )
            await handlePluginInstallUnified({ clean: true, concurrency: argv.concurrency })
          })
          .command("update [names..]", false, CommonArgv, async (argv) => {
            console.log(
              "\x1b[33m⚠ 'plugin update' 已弃用。请改用 'plugin install --latest'。\x1b[0m",
            )
            await handlePluginInstallUnified({
              names: argv.names?.length ? argv.names : undefined,
              latest: true,
              concurrency: argv.concurrency,
            })
          })
          .command("check", false, CommonArgv, async (argv) => {
            console.log(
              "\x1b[33m⚠ 'plugin check' 已弃用。请改用 'plugin install --latest --dry-run'。\x1b[0m",
            )
            await handlePluginInstallUnified({
              latest: true,
              dryRun: true,
              concurrency: argv.concurrency,
            })
          })
          .command(
            "resolve",
            false,
            {
              ...CommonArgv,
              "dry-run": {
                boolean: true,
                default: false,
                describe: "仅显示将要解析的内容，不实际修改",
              },
            },
            async (argv) => {
              console.log(
                "\x1b[33m⚠ 'plugin resolve' 已弃用。请改用 'plugin install --from-config'。\x1b[0m",
              )
              await handlePluginInstallUnified({
                fromConfig: true,
                dryRun: argv.dryRun,
                concurrency: argv.concurrency,
              })
            },
          )
          .demandCommand(0, "")
      )
    },
    async (argv) => {
      if (!argv._.includes("plugin") || argv._.length > 1) return
      await handlePluginStatus()
    },
  )
  .showHelpOnFail(true)
  .help()
  .updateStrings({
    "Show version number": "显示版本号",
    "Show help": "显示帮助",
  })
  .strict()
  .demandCommand().argv
