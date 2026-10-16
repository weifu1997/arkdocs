---
title: "安装"
aliases:
  - "setting up your GitHub repository"
---

本页会带你完成完整的 Quartz 设置：从获取源码、在本地预览，到推送到 GitHub。

## 1. 获取 Quartz

有两种开始方式，按你的偏好选择即可：

### 选项 A：使用 GitHub 模板（推荐）

> [!tip] 为什么推荐这个选项？
> 使用模板可以一键创建你自己的仓库，之后不必再重新配置 Git 远程仓库。

1. 打开 [Quartz 仓库](https://github.com/jackyzha0/quartz)，点击 **Use this template** → **Create a new repository**
2. 给仓库起一个名字（例如 `quartz`、`notes`、`garden`），选择公开或私有，然后点击 **Create repository**
3. 克隆**你的新仓库**并进入目录：

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

### 选项 B：直接克隆

如果你不使用 GitHub，或更喜欢手动设置：

```bash
git clone https://github.com/jackyzha0/quartz.git
cd quartz
```

> [!note]
> 使用此选项时，准备发布前需要把 `origin` 远程仓库 [[#连接本地克隆|指向你自己的仓库]]。

## 2. 安装依赖

> [!important]
> Quartz 需要 **Node.js 22** 或更高版本。用 `node -v` 检查版本，如有需要请到 [nodejs.org](https://nodejs.org/) 升级。

```bash
npm i
```

> [!note]
> 之后在其他机器上克隆自己的仓库时，请改用 `npm ci`，这样会按锁定文件更快、更可复现地安装依赖。

## 3. 初始化站点

运行交互式设置向导：

```bash
npx quartz create
```

它会询问你：

- **模板**（`default`、`obsidian`、`ttrpg`、`blog`）— 选择符合你用途的模板。各模板说明见 [[create#模板]]。
- **内容策略** — 选择如何填充 `content/` 文件夹：
  - **new**：从空白文件夹开始
  - **copy**：从已有文件夹复制文件（例如你的 Obsidian 仓库）
  - **symlink**：链接到已有文件夹，使更改自动同步
- **基础 URL** — 站点部署后的地址（例如 `mysite.github.io/quartz`）。不要包含 `https://`。
- **链接解析** 策略 — 如何解析内部链接（`shortest`、`absolute` 或 `relative`）。Obsidian 和 TTRPG 模板会跳过此项。

非交互用法和更多细节见 [[create|`quartz create` CLI 参考]]。

## 4. 安装插件

你选择的模板会引用需要安装的社区插件：

```bash
npx quartz plugin install --from-config
```

这会把 `quartz.config.yaml` 中列出的所有插件下载并构建到 `.quartz/plugins/`。

> [!tip]
> 如果部分插件构建失败，可以尝试刷新到最新版本：
>
> ```bash
> npx quartz plugin install --latest
> ```
>
> 详见 [[troubleshooting#Plugins fail to build on a fresh clone]]。

## 5. 预览站点

```bash
npx quartz build --serve
```

站点现在会运行在 `http://localhost:8080`。开发服务器会监听文件变化并自动重新加载。

此时你可以在 `content/` 文件夹中 [[authoring-content|开始撰写内容]]。准备发布时，继续下面的步骤，把站点推送到 GitHub 并 [[hosting|部署]]。

---

## 设置 GitHub 仓库

> [!note]
> 如果第 1 步使用了 **选项 A**（GitHub 模板），仓库已经存在，且 `origin` 也已设置好。可以直接跳到 [[#推送站点]]。

要发布站点，你需要自己的 GitHub 仓库。本节面向 **选项 B**（直接克隆）的用户。

### 创建仓库

在 [GitHub.com](https://github.com/new) 创建一个新仓库。**不要**用 README、许可证或 `.gitignore` 初始化它 — Quartz 已经包含这些文件，重复添加会在首次推送时产生合并冲突。

![[github-init-repo-options.png]]

从 Quick Setup 页面复制仓库 URL：

![[github-quick-setup.png]]

### 连接本地克隆

把本地 Quartz 指向你的新仓库：

```bash
# 查看当前远程仓库
git remote -v

# 将 origin 指向你的仓库
git remote set-url origin REMOTE-URL
```

> [!tip]
> 你不必手动添加 `upstream` 远程仓库 — `npx quartz create` 已经为你配置好了。`npx quartz upgrade` 会使用 upstream 拉取后续 Quartz 更新。

### 推送站点

```bash
npx quartz sync --no-pull
```

这会提交内容并把所有内容推送到你的仓库。之后更新时，只需运行：

```bash
npx quartz sync
```

> [!hint] 参数与选项
> 完整帮助信息可以运行 `npx quartz sync --help`。
>
> 大多数选项都有合理默认值，但如果你有自定义设置，也可以覆盖它们：
>
> - `-d` 或 `--directory`：内容文件夹。通常就是 `content`
> - `-v` 或 `--verbose`：输出更详细的日志信息
> - `--commit` 或 `--no-commit`：是否为更改创建 `git` 提交
> - `--push` 或 `--no-push`：是否将更新推送到你的 GitHub Quartz 仓库
> - `--pull` 或 `--no-pull`：推送前是否尝试从 GitHub 仓库拉取更新（例如来自其他设备的更改）

## 下一步

- **[[authoring-content|撰写内容]]** — 编写和组织笔记
- **[[hosting|部署]]** — 将站点部署到 GitHub Pages、Cloudflare、Netlify 或 Vercel
- **[[configuration|配置]]** — 自定义站点外观和行为
