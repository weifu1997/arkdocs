---
title: 良好页面
description: 这是一篇没有问题的页面。
tags:
  - good
  - 中文标签
draft: false
unlisted: false
---

# 良好页面

## 有效小节

这是一篇包含有效链接的页面：[[good-page#有效小节]]。

- 外链：[示例](https://example.com)
- 本地图片：![[images/photo.png]]
- 带空格的图片：![[images-with-space/a b.png]]
- 中文目录资源：![[中文目录/资源图.png]]
- 图片名含连字符与数字：![[images/photo-v1.png]]

代码块中的链接不应被检查：

```markdown
[[broken-link]]
```

行内代码 `[[never-checked]]` 也不应被检查。
