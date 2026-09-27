---
title: 欢迎使用 Quartz 5
---

Quartz 是一款开箱即用的静态站点生成器，能够将 Markdown 内容快速转换成功能完整的网站。已有数千名学生、开发者和教师在使用 [[showcase|Quartz]] 发布个人笔记、网站和[数字花园](https://jzhao.xyz/posts/networked-thought)。

## 🪴 快速开始

Quartz 至少需要 **[Node](https://nodejs.org/) v22** 和 `npm` v10.9.2 才能正常运行。继续之前，请确认本机已安装这些工具。安装说明见 [[getting-started/index#前置条件|前置条件]]。

> [!tip] GitHub 用户
> 也可以使用 **[GitHub 模板](https://github.com/jackyzha0/quartz/generate)** 一键创建仓库，然后再克隆。详见安装指南中的 [[installation#选项 A：使用 GitHub 模板（推荐）|选项 A]]。

```shell
# 1. 克隆 Quartz 仓库
git clone https://github.com/jackyzha0/quartz.git
cd quartz

# 2. 安装依赖
npm i

# 3. 初始化站点（选择模板、设置基础 URL、导入内容）
npx quartz create

# 4. 安装所选模板引用的插件
npx quartz plugin install --from-config

# 5. 在本地预览站点
npx quartz build --serve
```

站点现在会运行在 `http://localhost:8080`。接下来可以：

- 在 `content/` 文件夹中 **[[authoring-content|撰写内容]]**
- 使用 `npx quartz sync` **[[installation|推送到 GitHub]]**
- 部署到 GitHub Pages、Cloudflare、Netlify 或 Vercel，见 [[hosting|部署]]

完整流程请参阅 [[getting-started/index|入门指南]]。

### 已经用过 Quartz？

如果你已有 Quartz 仓库，只是在新机器上克隆：

```shell
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm ci
npx quartz plugin install
npx quartz build --serve
```

> [!tip]
> 如果全新克隆后构建出错，可以尝试 `npx quartz plugin install --latest`，将插件刷新到最新版本。详见 [[troubleshooting#全新克隆后插件构建失败]]。

## 🔧 功能

- 开箱即用：[[Obsidian compatibility|Obsidian 兼容]]、[[full-text search|全文搜索]]、[[graph view|关系图谱]]、[[wikilinks|双链与嵌入]]、[[plugins/Backlinks|反向链接]]、[[features/Latex|Latex]]、[[syntax highlighting|语法高亮]]、[[popover previews|预览弹出层]]、[[Docker Support|Docker 支持]]、[[i18n|国际化]]、[[features/comments|评论]]以及[更多功能](./features/)
- 修改配置后可热更新，修改内容后可增量构建
- 使用简洁的 JSX 布局和 [[creating components|页面组件]]
- [[SPA Routing|页面加载极快]]，打包体积也很小
- 可通过 [[making plugins|插件]] 完全自定义解析、过滤和页面生成

完整功能列表见[功能页面](./features/)。这些设计背后的原因见 [[philosophy|设计理念]]，技术概览见 [[architecture|架构]]。

### 🚧 故障排查与更新

使用 Quartz 遇到问题？可以用搜索功能查找，或查看 [[troubleshooting|故障排查]] 页面。如果还没有更新，请先 [[upgrading|升级]] 到最新版本，看看问题是否已经修复。

如果问题仍然存在，欢迎在发现问题后[提交 issue](https://github.com/jackyzha0/quartz/issues)，或到 [Discord 社区](https://discord.gg/cRFFHYye7t)求助。也可以浏览 [[community|社区]] 页面，了解第三方插件和相关资源。
