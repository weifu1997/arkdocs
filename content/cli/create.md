---
title: quartz create
---

`create` 命令用于初始化新的 Quartz 项目。它可以帮助你设置内容文件夹、选择配置模板、设置站点的基础 URL，以及配置 Quartz 处理 Markdown 文件的方式。

## 参数

| 参数          | 简写 | 说明                                                                  |
| ------------- | ---- | --------------------------------------------------------------------- |
| `--template`  | `-t` | 配置模板（`default`、`obsidian`、`ttrpg` 或 `blog`）                  |
| `--directory` | `-d` | Quartz 初始化所在的目录                                               |
| `--source`    | `-s` | Markdown 文件的源目录                                                 |
| `--strategy`  | `-X` | 处理源文件的方式（`new`、`copy` 或 `symlink`）                        |
| `--links`     | `-l` | 解析内部链接的方式（`absolute`、`shortest` 或 `relative`）            |
| `--baseUrl`   | `-b` | 站点的基础 URL（例如 `mysite.github.io/quartz`）                      |
| `--verbose`   | `-v` | 启用详细日志                                                          |

## 模板

运行 `quartz create` 时，可以选择一个配置模板，按使用场景预先配置 Quartz。所选模板总会覆盖 `quartz.config.yaml`，即使该文件已经存在。应用模板后，Quartz 会自动解析并安装模板所需的插件，同时移除不再引用的插件。

- **默认**：简洁的 Quartz 配置，采用合理默认值。适合从零开始。
- **Obsidian**：针对 Obsidian 仓库优化，完整支持 Obsidian Flavored Markdown（双链、标注、Mermaid 图表等）。会自动将链接解析设为 `shortest`，并跳过链接解析提示。
- **TTRPG**：基于 Obsidian 模板，额外加入 [Leaflet bases 插件](https://github.com/Requiae/quartz-leaflet-bases-plugin) 和 [ITS Theme](https://github.com/saberzero1/quartz-themes)（`its-theme.ttrpg-dnd`）。适合 D&D 和 TTRPG 维基。同样会跳过链接解析提示。
- **博客**：面向博客的配置，启用 [最近笔记](https://github.com/quartz-community/recent-notes)（显示最近 5 篇带标签的文章）和通过 giscus 提供的 [评论](https://github.com/quartz-community/comments)。你需要在 `quartz.config.yaml` 中把评论插件的 `TODO:` 占位值替换为自己的 giscus 仓库信息。

## 基础 URL

设置过程中，Quartz 会询问站点的基础 URL。这是站点部署后的地址（例如 `mysite.github.io/quartz`）。

- **不要**包含协议（`https://`）— 如果包含，会被自动去掉。
- 末尾斜杠也会自动去掉。
- `baseUrl` 的用途详见 [[configuration|配置]]。

## 策略

运行 `quartz create` 时，必须为内容选择一种策略：

- **new**：创建一个全新的空白内容文件夹。适合从零开始的新项目。
- **copy**：把源目录中的所有文件复制到 Quartz 内容文件夹。对于已有仓库来说最安全，因为不会改动原始文件。
- **symlink**：把 Quartz 内容文件夹符号链接到源目录。你在源目录中的更改（例如在 Obsidian 中）会立即反映到 Quartz。

## 链接解析

Quartz 需要知道如何解释 Markdown 文件中的内部链接：

- **shortest**：解析为最接近的匹配文件名。这是 Obsidian 的默认方式。
- **absolute**：相对于内容文件夹根目录解析链接。
- **relative**：相对于当前文件位置解析链接。

> [!note]
> 使用 **Obsidian** 或 **TTRPG** 模板时，链接解析会自动设为 `shortest`，并跳过提示。

## 交互式流程

如果运行 `npx quartz create` 且不带任何参数，它会通过交互式流程引导你完成设置：

1. **选择模板**：选择配置模板（`默认`、`Obsidian`、`TTRPG` 或 `博客`）。
2. **选择策略**：在 `new`、`copy` 或 `symlink` 之间选择。
3. **输入基础 URL**：提供站点托管后的 URL。
4. **选择链接解析**：选择链接格式（Obsidian 和 TTRPG 模板会跳过）。
5. **完成**：Quartz 会设置目录结构、创建配置，并自动安装模板中引用的插件。

## 示例：导入 Obsidian 仓库

要创建一个直接链接到已有 Obsidian 仓库的 Quartz 项目：

```shell
npx quartz create --template obsidian --strategy symlink --source ~/Documents/MyVault
```

这条命令会让 Quartz 使用 Obsidian 模板（完整 OFM 支持和最短路径链接解析），指向 `~/Documents/MyVault` 中的仓库，并使用符号链接以保持同步。

## 示例：设置博客

要快速设置带最近笔记和评论的博客：

```shell
npx quartz create --template blog --strategy new --baseUrl myblog.github.io
```

设置完成后，编辑 `quartz.config.yaml`，在评论插件部分填入你的 giscus 仓库信息。
