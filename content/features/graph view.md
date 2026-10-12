---
title: 关系图谱
tags:
  - component
---

Quartz 拥有强大的交互式图谱视图（Graph View），同时支持**局部关系图谱（Local Graph）**与**全局宏观图谱（Global Graph）**。

- **局部关系图谱**：展示与当前正在阅读的文件直接关联的笔记节点（包含链接到当前文件、或从当前文件引出的所有笔记）。换言之，它展示了所有与当前笔记“相距最多一跳”的相关笔记。
- **全局宏观图谱**：可通过点击局部图谱右上角的图标进行切换展开。它将为你全景式呈现整个知识库中的**所有笔记节点**及其网状交织关系。

> [!info] 提示
> Graph View 现在作为独立的社区插件提供。这既展示了外部插件如何扩展 Quartz 的能力，同时也作为插件开发的参考实现规范。

## 安装

Graph View 作为社区插件托管在 GitHub 上：

```bash
npm install github:quartz-community/graph --legacy-peer-deps
```

然后将其添加到你的 `quartz.config.yaml` 插件列表中：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/graph
    enabled: true
    layout:
      position: right
      priority: 10
```

## 功能特性

- **节点大小自适应**：节点的半径大小与该文件的总连接数（该文件的入链与出链总数）成正比，关联度越高的核心笔记在图谱中呈现越大。
- **已访问记忆**：类似于浏览器将访问过的链接以不同颜色高亮，图谱也会将你已经浏览过的节点标为已访问状态颜色（可以在 `theme.colors.tertiary` 中自定义）。

> [!info] 依赖项
> 关系图谱功能依赖在 [[configuration|配置]] 中启用 `ContentIndex` 发射器插件，用于构建全站索引。

## 自定义配置

绝大多数配置都可以通过向 `Graph()` 传入选项来定制。

默认推荐配置如下：

```yaml title="quartz.config.yaml"
plugins:
  - source: github:quartz-community/graph
    enabled: true
    options:
      localGraph:
        drag: true # 是否支持鼠标拖拽节点
        zoom: true # 是否支持滚轮缩放画布
        depth: 1 # 局部图谱的跳转跳数深度（默认为 1 跳）
        scale: 1.1 # 局部图谱渲染缩放比例
        repelForce: 0.5 # 节点间的排斥力强度
        centerForce: 0.3 # 吸引向中心的向心力强度
        linkDistance: 30 # 关联连线的理想长度
        fontSize: 0.6 # 节点标签文字字体大小
        opacityScale: 1 # 透明度比例
        removeTags: [] # 需要从图谱中排除隐藏的标签列表
        showTags: true # 是否将 Tags 标签作为独立节点在图谱中展示
        enableRadial: false # 是否启用径向辐射式布局
      globalGraph:
        drag: true # 全局图谱是否允许拖拽
        zoom: true # 全局图谱是否允许缩放
        depth: -1 # 全局深度（-1 表示遍历全站所有层级）
        scale: 0.9 # 全局图谱的渲染缩放比例
        repelForce: 0.5 # 排斥力
        centerForce: 0.3 # 向心力
        linkDistance: 30 # 连线长度
        fontSize: 0.6 # 文字大小
        opacityScale: 1 # 透明度比例
        removeTags: [] # 排除的标签
        showTags: true # 是否展示标签节点
        focusOnHover: true # 鼠标悬浮时高亮相连节点
        enableRadial: true # 是否启用径向辐射式布局
    layout:
      position: right
      priority: 10
```

如果你想保持某项字段的默认值，直接在配置中省略该字段即可。

如需彻底移除图谱视图，直接在 `quartz.config.yaml` 中将该插件设为 `enabled: false` 或删除对应的插件项。
