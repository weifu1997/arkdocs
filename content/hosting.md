---
title: 生产环境托管与部署
---

Quartz 会把 Markdown 笔记和其他静态资产全量编译为由纯静态 HTML、JS 和 CSS 构成的网站产物包。

如果你希望将站点公开发布到互联网上，就需要选择一种托管方式。本指南介绍各大主流云平台与自建服务器的部署方案；任何支持托管静态 HTML 的平台均可无缝使用。

> [!warning] 前置条件
> 本指南默认你已经将 Quartz 项目推送到个人的 GitHub 仓库。如果尚未创建，请先按照安装指南中的 [[installation#选项 A：使用 GitHub 模板（推荐）|GitHub 仓库设置]] 进行操作。

> [!hint] 关键配置提示
> 部分 Quartz 核心功能（例如 [[RSS Feed|RSS 订阅]] 与 Sitemap 站点地图生成）需要在 `quartz.config.yaml` 的 [[configuration|全局配置]] 中正确指定 `baseUrl` 域名。部署上线前请确保已配置此项。

> [!tip] 保持插件同步
> 下面所有托管示例都优先使用 `npx quartz plugin install` 从锁定文件安装插件。如果贡献者向仓库添加了新插件却未更新锁定文件，可在构建脚本中追加 `npx quartz plugin install --from-config` 以确保依赖完备。详见 [[cli/plugin#install|plugin install]]。

## Cloudflare Pages（推荐）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/) 并进入你的账号主页；
2. 在侧边导航栏中，依次选择 **Compute (Workers)** > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**；
3. 选择关联你的 Quartz GitHub 仓库，并在 **Set up builds and deployments（构建与部署设置）** 区域填写以下信息：

| 配置选项 | 填写值 |
| ---------------------- | ----------------------------------------------- |
| Production branch（生产分支） | `v5` |
| Framework preset（框架预设） | `None` |
| Build command（构建命令） | `npx quartz plugin install && npx quartz build` |
| Build output directory（输出目录） | `public` |

点击 **"Save and deploy"（保存并部署）**，Cloudflare 将在约一分钟内完成自动化打包上线。此后，每次你通过 `npx quartz sync` 向 GitHub 推送笔记更新时，网站都会自动触发重新构建与即时发布。

如需绑定自定义独立域名，请参阅 [Cloudflare Pages 官方自定义域名指南](https://developers.cloudflare.com/pages/platform/custom-domains/)。

> [!warning] Git 浅克隆时间戳说明
> Cloudflare Pages 默认采用浅克隆（Shallow Clone）。如果你依赖 Git 提交历史作为笔记的创建/修改时间戳，建议在构建命令前加上 `git fetch --unshallow &&`（即：`git fetch --unshallow && npx quartz plugin install && npx quartz build`）。

---

## GitHub Pages

在本地 Quartz 项目中创建 GitHub Actions 工作流文件：`.github/workflows/deploy.yml`。

```yaml title=".github/workflows/deploy.yml"
name: Deploy Quartz site to GitHub Pages

on:
  push:
    branches:
      - v5

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0 # 获取完整 Git 提交历史用于时间戳
      - uses: actions/setup-node@v6
        with:
          node-version: 24
      - name: Cache dependencies
        uses: actions/cache@v5
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      - name: Cache Quartz plugins
        uses: actions/cache@v5
        with:
          path: .quartz/plugins
          key: ${{ runner.os }}-plugins-${{ hashFiles('quartz.lock.json') }}
          restore-keys: |
            ${{ runner.os }}-plugins-
      - name: Install Dependencies
        run: npm ci
      - name: Install Quartz plugins
        run: npx quartz plugin install
      - name: Build Quartz
        run: npx quartz build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

随后：

1. 进入 GitHub 仓库页面的 **Settings** 选项卡，在左侧栏点击 **Pages**。在 **Source** 下拉菜单中选择 **"GitHub Actions"**；
2. 执行 `npx quartz sync` 提交并推送到远端。GitHub Actions 将自动执行流水线，将你的站点部署到 `<你的用户名>.github.io/<仓库名>`。

### 绑定自定义独立域名（GitHub Pages）

1. 进入仓库 **Settings** 页面，在侧边栏点击 **Pages**；
2. 在 **Custom Domain** 栏目中输入你的独立域名并点击保存；
3. 根据域名类型配置 DNS 解析记录：
   - **顶格主域名（Apex Domain，如 `example.com`）**：在 DNS 服务商处添加 `A` 记录，解析指向 GitHub 官方服务器 IP：
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - **子域名（Subdomain，如 `notes.example.com`）**：添加 `CNAME` 记录，解析指向 `<你的用户名>.github.io`。

---

## Vercel

### 1. 配置 cleanUrls

在部署至 Vercel 之前，需要在项目根目录下创建 `vercel.json` 配置文件，使访问 URL 时无需携带 `.html` 后缀：

```json title="vercel.json"
{
  "cleanUrls": true
}
```

### 2. 导入与部署

1. 登录 [Vercel 控制台](https://vercel.com/dashboard)，点击 **"Add New..." > Project**；
2. 关联并导入你的 Quartz GitHub 仓库；
3. 确认以下构建选项：

| 配置选项 | 填写值 |
| ----------------------------------------- | ----------------------------------------------- |
| Framework Preset（框架预设） | `Other` |
| Root Directory（根目录） | `./` |
| Build Command（构建命令） | `npx quartz plugin install && npx quartz build` |
| Output Directory（输出目录） | `public` |

4. 点击 **Deploy**，部署完成后即可获得免费分配的 `*.vercel.app` 预览域名。

---

## Netlify

1. 登录 [Netlify 控制台](https://app.netlify.com/)，点击 **"Add new site" > Import an existing project**；
2. 关联你的 Quartz Git 仓库；
3. 在 **Build command** 处填入：`npx quartz plugin install && npx quartz build`；
4. 在 **Publish directory** 处填入：`public`；
5. 点击 **Deploy** 即可完成部署。

---

## 自建服务器（Nginx / Apache / Caddy）

只需将构建生成的 `public/` 静态目录完整拷贝至你的 Web 服务器中。由于 Quartz 生成的页面链接不包含 `.html` 后缀，需在 Web 服务器中配置重写规则：

### Nginx 配置

```nginx title="nginx.conf"
server {
    listen 80;
    server_name example.com;
    root /path/to/quartz/public;
    index index.html;
    error_page 404 /404.html;

    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

### Caddy 配置

```caddy title="Caddyfile"
example.com {
    root * /path/to/quartz/public
    try_files {path} {path}.html {path}/ =404
    file_server
    encode gzip

    handle_errors {
        rewrite * /{err.status_code}.html
        file_server
    }
}
```

## 缓存策略建议（Caching）

Quartz 在打包 CSS 和 JS 资源时会在文件名中自动计算并嵌入内容哈希（例如 `index-a3f2c1b.css`、`component-7d4e2f.css`）。由于每次内容改动哈希均会刷新，因此对于这些哈希静态资源，可在 Web 服务器上设置长效永久缓存；而 HTML 页面建议设置为短时缓存或无缓存（`Cache-Control: no-cache`），以确保访客始终获取最新的文章引用。
