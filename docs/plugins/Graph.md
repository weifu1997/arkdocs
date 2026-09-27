---
title: Graph
description: 交互式链接关系图谱可视化。
tags:
  - plugin/component
image:
repository: "[quartz-community/graph](https://github.com/quartz-community/graph)"
enabled: true
required: false
---

Interactive graph visualization.

> [!note]
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件|配置]] 页面。

See [[graph view]] for detailed usage information.

## 配置

该插件接受以下配置选项：

- `localGraph`: Options for the local graph view.
- `globalGraph`: Options for the global graph view.

Both `localGraph` and `globalGraph` accept the following options:

- `drag`: Enable dragging nodes. Defaults to `true`.
- `zoom`: Enable zooming. Defaults to `true`.
- `depth`: The depth of the graph. Defaults to `1` for local and `-1` for global.
- `scale`: The initial scale of the graph. Defaults to `1.1` for local and `0.9` for global.
- `repelForce`: The force that pushes nodes apart. Defaults to `0.5`.
- `centerForce`: The force that pulls nodes to the center. Defaults to `0.3` for local and `0.2` for global.
- `linkDistance`: The distance between linked nodes. Defaults to `30`.
- `fontSize`: The font size of node labels. Defaults to `0.6`.
- `opacityScale`: The scale of node opacity. Defaults to `1`.
- `removeTags`: Tags to exclude from the graph. Defaults to `[]`.
- `showTags`: Whether to show tags in the graph. Defaults to `true`.
- `enableRadial`: Whether to enable radial layout. Defaults to `false` for local and `true` for global.
- `focusOnHover`: Whether to focus on the hovered node. Defaults to `false` for local and `true` for global.

### 默认选项

```yaml title="quartz.config.yaml"
- source: github:quartz-community/graph
  enabled: true
  options:
    localGraph:
      drag: true
      zoom: true
      depth: 1
      scale: 1.1
      repelForce: 0.5
      centerForce: 0.3
      linkDistance: 30
      fontSize: 0.6
      opacityScale: 1
      removeTags: []
      showTags: true
      focusOnHover: false
      enableRadial: false
    globalGraph:
      drag: true
      zoom: true
      depth: -1
      scale: 0.9
      repelForce: 0.5
      centerForce: 0.3
      linkDistance: 30
      fontSize: 0.6
      opacityScale: 1
      removeTags: []
      showTags: true
      focusOnHover: true
      enableRadial: true
```

## API

- Category: Component
- Function name: `ExternalPlugin.Graph()`.
- 源码： [`quartz-community/graph`](https://github.com/quartz-community/graph)
- 安装： `npx quartz plugin add github:quartz-community/graph`
