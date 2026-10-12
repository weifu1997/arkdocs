---
title: Graph
description: "交互式双向链接网络关系图谱可视化组件。"
tags:
  - plugin/component
image:
repository: "[quartz-community/graph](https://github.com/quartz-community/graph)"
enabled: true
required: false
---

交互式关系图谱可视化组件。

> [!note] 提示
> 关于如何添加、移除或配置插件，请参阅 [[configuration#插件体系（Plugins）|配置]] 页面。

详见 [[features/graph view|关系图谱详细指南]]。

## 配置选项

该插件接受以下配置选项：

- `localGraph`：针对当前页面的局部关系图谱选项。
- `globalGraph`：全景宏观全局关系图谱选项。

`localGraph` 和 `globalGraph` 均支持以下详细物理引擎与渲染参数：

- `drag`：是否允许鼠标拖拽节点位置。默认为 `true`。
- `zoom`：是否允许滚轮缩放画布。默认为 `true`。
- `depth`：图谱遍历的跳数深度。局部图谱默认为 `1`，全局图谱默认为 `-1`（遍历全站）。
- `scale`：初始缩放比例。局部图谱默认为 `1.1`，全局图谱默认为 `0.9`。
- `repelForce`：节点之间的排斥力强度。默认为 `0.5`。
- `centerForce`：将节点吸引向画布中央的向心力强度。局部图谱默认为 `0.3`，全局图谱默认为 `0.2`。
- `linkDistance`：节点之间连线的理想自然长度。默认为 `30`。
- `fontSize`：节点文本标签的字号大小。默认为 `0.6`。
- `opacityScale`：节点不透明度缩放比。默认为 `1`。
- `removeTags`：从图谱中排除隐藏的标签名称列表。默认为 `[]`。
- `showTags`：是否将标签作为独立节点在图谱中绘制展现。默认为 `true`。
- `enableRadial`：是否启用径向环形辐射布局。局部图谱默认为 `false`，全局图谱默认为 `true`。
- `focusOnHover`：鼠标悬停在某个节点上时，是否高亮与其相连的所有直接关系节点。局部图谱默认为 `false`，全局图谱默认为 `true`。

### 默认配置示例

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

- 类别：组件（Component）
- 函数名：`ExternalPlugin.Graph()`
- 源码：[`quartz-community/graph`](https://github.com/quartz-community/graph)
- 安装：`npx quartz plugin add github:quartz-community/graph`
