---
title: 入门指南
---

本指南会带你从零开始配置 Quartz。如果你已经在首页完成了 [[index#🪴 快速开始|快速开始]]，可以直接跳到当前所在的步骤。

## 前置条件

继续之前，请先安装以下工具：

- **[Node.js](https://nodejs.org/) v22 或更高版本**（运行 `node -v` 检查）
- **npm v10.9.2 或更高版本**（随 Node 一起提供，运行 `npm -v` 检查）
- **[Git](https://git-scm.com/)**（运行 `git -v` 检查）

> [!warning] 常见问题
>
> - **Linux**：系统包（`apt install nodejs`）通常版本较旧。请使用 [nvm](https://github.com/nvm-sh/nvm) 或 [NodeSource](https://github.com/nodesource/distributions) 源安装 Node.js v22。
> - **Windows**：安装 Git 时，请确保勾选 **"Git from the command line and also from 3rd-party software"**，以便终端中可以使用 `git`。如果 `node -v` 或 `git -v` 提示找不到命令，请重启终端或检查 PATH。
> - **macOS**：Xcode 命令行工具包含 Git（`xcode-select --install`）。Node.js 可以使用 [nvm](https://github.com/nvm-sh/nvm) 或[官方安装包](https://nodejs.org/)。

## 设置步骤

请按以下顺序进行：

1. **[[installation|安装]]** — 获取 Quartz（通过 GitHub 模板或克隆），安装依赖，运行初始化向导（`npx quartz create`），安装插件，并在本地预览站点
2. **[[authoring-content|撰写内容]]** — 在 `content/` 文件夹中编写和组织 Markdown 笔记
3. **[[installation#设置 GitHub 仓库|推送到 GitHub]]** — 创建仓库，并用 `npx quartz sync` 推送站点
4. **[[hosting|部署]]** — 免费将站点托管到 GitHub Pages、Cloudflare、Netlify 或 Vercel

## 升级与迁移

- **[[whats-new|Quartz 5 的新变化]]** — 新功能和变更概览
- **[[upgrading|升级 Quartz]]** — 保持 Quartz 为最新版本
- **[[migrating|迁移到 Quartz 5]]** — 从 Quartz 4 或 Quartz 3 迁移
