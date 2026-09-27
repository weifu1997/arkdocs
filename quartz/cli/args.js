export const CommonArgv = {
  directory: {
    string: true,
    alias: ["d"],
    default: "content",
    describe: "用于查找内容文件的目录",
  },
  verbose: {
    boolean: true,
    alias: ["v"],
    default: false,
    describe: "输出更详细的日志信息",
  },
  concurrency: {
    number: true,
    alias: ["c"],
    describe: "最大并行操作数（默认：CPU 核心数）",
  },
}

export const CreateArgv = {
  ...CommonArgv,
  template: {
    string: true,
    alias: ["t"],
    choices: ["default", "obsidian", "ttrpg", "blog"],
    describe: "初始化配置时使用的模板",
  },
  source: {
    string: true,
    alias: ["s"],
    describe: "用于复制或创建符号链接的源目录",
  },
  strategy: {
    string: true,
    alias: ["X"],
    choices: ["new", "copy", "symlink"],
    describe: "内容目录的初始化策略",
  },
  baseUrl: {
    string: true,
    alias: ["b"],
    describe: "站点的基础 URL（例如 mysite.github.io/quartz）",
  },
  links: {
    string: true,
    alias: ["l"],
    choices: ["absolute", "shortest", "relative"],
    describe: "链接解析策略",
  },
}

export const SyncArgv = {
  ...CommonArgv,
  commit: {
    boolean: true,
    default: true,
    describe: "为尚未保存的更改创建 git 提交",
  },
  message: {
    string: true,
    alias: ["m"],
    describe: "覆盖默认的 Quartz 提交说明",
  },
  push: {
    boolean: true,
    default: true,
    describe: "将更新推送到你的 Quartz 仓库",
  },
  pull: {
    boolean: true,
    default: true,
    describe: "从你的 Quartz 仓库拉取更新",
  },
}

export const BuildArgv = {
  ...CommonArgv,
  output: {
    string: true,
    alias: ["o"],
    default: "public",
    describe: "构建输出目录",
  },
  serve: {
    boolean: true,
    default: false,
    describe: "启动本地服务器以实时预览站点",
  },
  watch: {
    boolean: true,
    default: false,
    describe: "监听文件变化并自动重新构建",
  },
  baseDir: {
    string: true,
    default: "",
    describe: "本地服务器使用的基础路径",
  },
  port: {
    number: true,
    default: 8080,
    describe: "本地预览服务的端口",
  },
  wsPort: {
    number: true,
    default: 3001,
    describe: "用于热更新通知的 WebSocket 端口",
  },
  remoteDevHost: {
    string: true,
    default: "",
    describe: "非 localhost 开发时覆盖 WebSocket 连接地址",
  },
  bundleInfo: {
    boolean: true,
    default: false,
    describe: "显示详细的打包信息",
  },
}
