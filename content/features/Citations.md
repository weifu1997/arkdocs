---
title: 学术引用（Citations）
tags:
  - feature/transformer
---

Quartz 借助 [rehype-citation](https://github.com/timlrx/rehype-citation) 支持解析 BibTeX 格式的参考文献数据库文件。

在默认配置下，引用键 `[@templeton2024scaling]` 会被自动导出并渲染为学术引用格式 `(Templeton et al., 2024)`。

> [!example]- BibTeX 数据库示例
>
> ```bib title="bibliography.bib"
> @article{templeton2024scaling,
>   title={Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet},
>   author={Templeton, Adly and Conerly, Tom and Marcus, Jonathan and Lindsey, Jack and Bricken, Trenton and Chen, Brian and Pearce, Adam and Citro, Craig and Ameisen, Emmanuel and Jones, Andy and Cunningham, Hoagy and Turner, Nicholas L and McDougall, Callum and MacDiarmid, Monte and Freeman, C. Daniel and Sumers, Theodore R. and Rees, Edward and Batson, Joshua and Jermyn, Adam and Carter, Shan and Olah, Chris and Henighan, Tom},
>   year={2024},
>   journal={Transformer Circuits Thread},
>   url={https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html}
> }
> ```

> [!note] 参考文献列表呈现位置
>
> 默认情况下，参考文献列表会自动追加在文章最末尾。如果希望精确指定参考文献列表的插入位置，可以在正文中放置 `[^ref]` 占位符。
>
> 更多信息请参阅 `rehype-citation` 官方说明。

## 自定义与启用

引用解析功能由 [[plugins/Citations|Citations]] 插件提供。**该插件默认未启用**，如需开启请参考该插件页面配置 BibTeX 文件路径与引用样式（如 APA、IEEE 等）。
