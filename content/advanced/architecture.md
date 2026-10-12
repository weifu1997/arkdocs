---
title: 架构与工作原理
---

Quartz 是一款高性能静态站点生成器。它的底层是如何运转的？

要弄清楚这个问题，最佳切入点是追踪当你在终端中执行 `npx quartz build` 时，系统底层到底经历了怎样的全流程：

## 服务端构建流程

1. **入口解析**：执行 `npx quartz build` 后，npm 会读取 `package.json` 中的 `bin` 字段，找到指向 `./quartz/bootstrap-cli.mjs` 的入口文件。
2. **环境引导**：该文件顶部的 [Shebang](https://en.wikipedia.org/wiki/Shebang_(Unix)) 声明指示操作系统使用 Node.js 执行。
3. **`bootstrap-cli.mjs` 核心职责**：
   1. 使用 [yargs](http://yargs.js.org/) 解析命令行传入的各种参数，同时在这里处理用于管理外部插件的 `plugin` 子命令。
   2. 使用 [esbuild](https://esbuild.github.io/) 将 Quartz 其余的 TypeScript 源码实时转译并打包为标准 JavaScript。这里的 `esbuild` 配置经过精心定制：它通过 [esbuild-sass-plugin v2](https://www.npmjs.com/package/esbuild-sass-plugin) 直接处理 `.scss` 样式文件的导入；同时，通过自定义 esbuild 插件，启动另一个专门面向浏览器环境的 esbuild 实例，将组件声明的内联客户端脚本（任何 `.inline.ts` 文件）打包为纯文本导入。
   3. 如果指定了 `--serve` 参数，则启动本地开发服务器。这会启动两个服务端口：
      1. 监听在 3001 端口的 WebSocket 服务，用于分发热重载（Hot-reload）信号。它追踪所有客户端连接，一旦检测到服务端变更（无论是内容变更还是配置改动）即向浏览器推送刷新消息；
      2. 监听在指定端口（默认为 8080）的 HTTP 静态文件服务器，对外提供编译好的网页访问。
   4. 如果带有 `--serve` 参数，还会启动源码监听器（File Watcher），监控 `.ts`、`.tsx`、`.scss` 等核心代码的改动。当检测到修改时，调用 esbuild 的 [增量重新构建 API（Rebuild API）](https://esbuild.github.io/api/#rebuild) 实现毫秒级的秒速热重构。
   5. 转译主构建模块（`quartz/build.ts`）后，将其输出到缓存文件 `.quartz-cache/transpiled-build.mjs`，并通过 `await import(cacheFile)` 进行动态导入。为了绕过 Node.js 固有的模块导入缓存机制，我们在路径后追加随机 Query 参数，使其作为全新模块加载，随后调用构建主函数并传入解析好的 CLI 参数。
4. **`build.ts` 处理流水线**：
   1. **清理输出目录**：清理并重置 `public` 生成目录。
   2. **文件检索**：根据 `.gitignore` 规则，递归扫描 `content` 文件夹中的所有 Markdown 及静态文件。
   3. **Markdown 深度解析**：
      1. Quartz 会自动检测系统的 CPU 核心线程数。如果待解析的内容量较多（>128 篇），它会自动创建基于任务窃取机制的 [workerpool 多线程工作池](https://www.npmjs.com/package/workerpool)，以 128 篇为一批次分发给多个子线程并发解析。
      2. 每个 Worker（若单线程则为主线程）根据 [[configuration|配置文件]] 中声明的插件流水线构建 [unified](https://github.com/unifiedjs/unified) 语法处理器。
      3. 解析阶段依次包含以下七个细分子步骤：
         1. 将磁盘文件读取为虚拟文件对象 [vfile](https://github.com/vfile/vfile)；
         2. 执行插件定义的纯文本前置转换（Text-to-Text）；
         3. 对文件路径进行标准化 Slug 转换并存入文件元数据（详见 [[paths|路径机制]]）；
         4. 使用 [remark-parse](https://www.npmjs.com/package/remark-parse) 将文本解析为 Markdown 抽象语法树（[mdast](https://github.com/syntax-tree/mdast)）；
         5. 执行插件定义的 Markdown 语法树转换（Markdown-to-Markdown）；
         6. 使用 [remark-rehype](https://github.com/remarkjs/remark-rehype) 将 mdast 转换为 HTML 抽象语法树（[hast](https://github.com/syntax-tree/hast)）；
         7. 执行插件定义的 HTML 语法树转换（HTML-to-HTML）。
   4. **内容过滤（Filtering）**：通过过滤器插件剔除不需要发布的页面（如草稿或私有文章）。
   5. **文件发射与输出（Emitting）**：
      1. 搜集并汇总每个发射器（Emitter）插件声明的全部静态资源（外部 CSS、JS 脚本模块等）。
      2. 负责输出 HTML 页面的发射器会执行额外处理：使用 [hast-util-to-jsx-runtime](https://github.com/syntax-tree/hast-util-to-jsx-runtime) 将解析出的 hast 转换为 JSX，并借由 [Preact](https://preactjs.com/) 运行时的 [preact-render-to-string](https://github.com/preactjs/preact-render-to-string) 在服务端静态渲染为最终的 HTML 字符串。在此过程中，系统还会从 `quartz.config.yaml` 组装页面[[layout|布局（Layout）]]、内联脚本与样式表。
         - CSS 样式通过 [Lightning CSS](https://github.com/parcel-bundler/lightningcss) 自动完成压缩、语法降级与浏览器厂商前缀补全；
         - 脚本被分为 `beforeDOMLoaded`（DOM 加载前）和 `afterDOMLoaded`（DOM 加载后），分别注入到 `<head>` 与 `<body>` 标签中。
      3. 各发射器将自身产出的成果（HTML、XML、JSON 索引等）写入磁盘输出。
   6. **增量监听更新**：在开发服务模式下，设立针对 `.md` 内容的去抖动监听器（Debounce 阈值 250ms），维护全量内容 AST 映射图谱，在内容变更时仅针对改动路径做增量重新生成并触发浏览器无感重载。

## 客户端运行时

1. 浏览器打开 Quartz 页面并加载 HTML 结构。`<head>` 中引入了核心样式表（`public/index.css`）和核心优先执行脚本（`public/prescript.js`）。
2. 在 `<body>` 页面骨架载入后，浏览器进一步加载非关键延迟脚本（`public/postscript.js`）。
3. 页面完成载入后，Quartz 会在全局派发一个专有的自定义浏览器事件 `"nav"`。所有组件声明的客户端脚本均监听此事件，以安全地初始化依赖 DOM 的交互逻辑。
   - 若开启了 [[SPA Routing|SPA 单页无刷新路由]]，在每一次客户端路由导航跳转时，`"nav"` 事件都会被再次派发，以便组件解绑并重新注册事件监听器与状态；
   - 若未开启 SPA，该事件仅在首次页面载入完成后触发一次，从而保证无论是单页还是多页环境下组件逻辑的一致性；
   - 当 DOM 在不经过完整导航的情况下局部增量替换时（例如文章解密），会派发专门的 `"render"` 事件。

## 社区包分层设计（Community Package Layering）

Quartz v5 将核心共享代码解耦为三个职责清晰的独立社区包：

- **`@quartz-community/types`**：类型定义、接口协议以及针对 `vfile` DataMap 的扩展。这是 Quartz 核心与所有插件之间的标准“契约”，没有任何运行时依赖。
- **`@quartz-community/utils`**：通用工具库（路径运算、DOM 辅助函数、排序算法、日期格式化、JSX 转换工具等）。仅依赖 `@quartz-community/types`。
- **`@quartz-community/runtime`**：专门面向浏览器端内联脚本的运行时工具（事件总线、SPA 路由导航、本地存储、外部脚本动态加载等）。同时依赖 `types` 和 `utils`。

```
types（无任何依赖）
  ↑
utils（依赖 types）
  ↑
runtime（依赖 types + utils）
  ↑
plugins 插件（按需组合依赖上述包）
```

这种严密的分层架构确保了插件无需直接强绑定或依赖 Quartz 核心源码仓库。

## 插件系统（Plugin System）

Quartz v5 引入了全新的分布式社区插件体系。插件是独立的 Git 仓库，被克隆安装到本地 `.quartz/plugins/` 目录中，并通过自动生成的入口文件 `.quartz/plugins/index.ts` 进行统一重导出。

### 插件分类

插件目前分为五大类型：

- **转换器（Transformers）**：负责内容映射与加工（解析 Frontmatter、生成摘要、代码高亮等）；
- **过滤器（Filters）**：负责内容条件筛选（剔除草稿、过滤私有内容等）；
- **发射器（Emitters）**：负责内容归约汇总与资产输出（生成 RSS、Sitemap、别名重定向、社交封面图等）；
- **页面类型（Page Types）**：定义不同类型页面的专属渲染逻辑（文章内容页、文件夹聚合页、标签聚合页、404 页）。系统内的 `PageTypeDispatcher` 发射器会根据内容特征将页面分发给对应的页面类型插件处理；
- **Bases 视图（Bases Views）**：为 `bases-page` 数据库插件提供多维视图渲染器。插件可通过 `ViewRegistry` 注册全新的视图展现方式（如时间线、看板等）。详见 [[making plugins#Bases 视图开发|制作插件]]。

需要注意的是，这些分类**并非互斥**——单个插件可以既是转换器同时又提供前端组件（如 `obsidian-flavored-markdown`），也可以既是页面类型同时又自带专属页面框架（如 `canvas-page`）。

### 插件安装与解析流程

当你执行 `npx quartz plugin add github:quartz-community/explorer` 时：

1. 目标 Git 仓库会被克隆到 `.quartz/plugins/explorer/`；
2. 插件会调用 `tsup` 进行本地编译构建（配置在插件的 `tsup.config.ts` 中）；
3. 系统自动更新 `.quartz/plugins/index.ts`，导出所有已安装插件；
4. 插件的精确 Commit Hash 会被锁定并记录在 `quartz.lock.json` 中。

### 插件命令行指令速查

- `npx quartz plugin add github:quartz-community/<名称>` —— 安装社区插件；
- `npx quartz plugin install --latest` —— 将所有已装插件更新至各自仓库的最新提交；
- `npx quartz plugin install --clean` —— 根据 `quartz.lock.json` 中的锁定版本精确恢复插件（常用于 CI/CD 流水线）；
- `npx quartz plugin remove <名称>` —— 移除已安装的插件。

## 页面框架（Page Frames）

页面框架（Page Frames）决定了每个页面的内部 HTML 骨架排布。虽然顶层外壳（`<html>`、`<head>`、`<body>`、`#quartz-root`）对于全站保持统一（这是 [[SPA Routing|SPA 路由]] 正常工作的前提），但框架决定了侧边栏、内容槽位以及页脚在页面壳内的具体网格结构。

框架系统位于 `quartz/components/frames/`，包含：

- `types.ts` —— 定义 `PageFrame` 与 `PageFrameProps` 核心接口；
- `DefaultFrame.tsx` —— 经典三栏布局（左侧栏、中央正文、右侧栏、页脚）；
- `FullWidthFrame.tsx` —— 无侧栏的单栏全宽流式布局；
- `MinimalFrame.tsx` —— 极简框架（无侧栏、无顶栏、仅保留正文和页脚）；
- `registry.ts` —— 管理由插件注册的自定义框架的单例 `FrameRegistry`；
- `index.ts` —— 框架解析调度函数 `resolveFrame()`。

页面框架会被挂载为 `.page` 元素上的 `data-frame` 属性，方便在样式表中进行精确的作用域样式定制。有关用户侧配置与开发者插件扩展，请分别参阅 [[layout#页面框架（Page Frames）|页面布局文档]] 与 [[making plugins#提供自定义页面框架|制作插件指南]]。
