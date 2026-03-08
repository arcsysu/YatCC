# 旧 Docsify 框架备份

这个文件用于集中备份迁移前的 Docsify 入口和导航骨架，避免旧框架文件分散在仓库顶层造成干扰。

## 备份范围

- 旧入口页：docs/index.html
- 旧侧边栏：docs/_sidebar.md
- 旧项目说明：docs/README.md

## 旧入口页：docs/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Document</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
    <meta name="description" content="Description" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, minimum-scale=1.0"
    />
    <link
      rel="stylesheet"
      href="//cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css"
    />
  </head>

  <body>
    <div id="app">加载中...</div>
    <script>
      window.$docsify = {
        name: "YatCC 实验文档",
        repo: "https://github.com/arcsysu/YatCC",
        loadSidebar: true,
        loadNavbar: true,
        coverpage: false,
        maxLevel: 5,
        subMaxLevel: 4,
        mergeNavbar: true,
        search: {
          maxAge: 86400000,
          paths: "auto",
          placeholder: "搜索",
          placeholder: {
            "/zh-cn/": "搜索",
            "/": "Type to search",
          },
          noData: "找不到结果",
          depth: 4,
          hideOtherSidebarContent: false,
          namespace: "Docsify-Guide",
        },
      };
    </script>
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/emoji.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/zoom-image.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify-copy-code/dist/docsify-copy-code.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-antlr4.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-c.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-cpp.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-bash.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-llvm.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-json.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-cmake.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/prismjs@1/components/prism-bison.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/katex@latest/dist/katex.min.js"></script>
    <link
      rel="stylesheet"
      href="//cdn.jsdelivr.net/npm/katex@latest/dist/katex.min.css"
    />
    <script src="//cdn.jsdelivr.net/npm/marked@4"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify-katex@latest/dist/docsify-katex.js"></script>
  </body>
</html>
```

## 旧侧边栏：docs/_sidebar.md

```md
<!-- _sidebar.md -->

- 前言
  - [环境配置](introduction/environment.md)
  - [实验框架使用方法](introduction/howtouse.md)
  - [最终评测方式说明](introduction/finalscore.md)
  - [AI 工具使用方法](introduction/agent.md)
  - [vibe coding指南](introduction/vibecoding.md)
  - [大模型提示工程](introduction/prompt.md)
  - [帮助我们改进实验](introduction/helptoimprove.md)
- Task0
  - [实验介绍](task0_doc/task0.md)
- Task1
  - [实验介绍](task1_doc/overview.md)
  - [使用 flex 完成 Task1](task1_doc/flex.md)
  - [使用 antlr 完成 Task1](task1_doc/antlr.md)
  - [Prompt 示例](task1_doc/prompt.md)
  - [API 速查](task1_doc/apidoc.md)
- Task2
  - [实验介绍](task2_doc/overview.md)
  - [公用代码介绍](task2_doc/share.md)
  - [使用 bison 完成 Task2](task2_doc/bison.md)
  - [使用 antlr 完成 Task2](task2_doc/antlr.md)
  - [Prompt 示例](task2_doc/prompt.md)
- Task3
  - [实验介绍](task3_doc/overview.md)
  - [EmitIR 介绍](task3_doc/emitir.md)
  - [LLVM 介绍](task3_doc/llvm.md)
  - [上手教程](task3_doc/start.md)
  - [Prompt 示例](task3_doc/prompt.md)
  - [LLVM API](task3_doc/apidoc.md)
- Task4
  - [实验介绍](task4_doc/overview.md)
  - [代码框架介绍](task4_doc/framework.md)
  - [优化算法](task4_doc/optimizations.md)
  - [Prompt 示例](task4_doc/prompt.md)
  - [API 速查](task4_doc/apidoc.md)
- Task5
  - [整体介绍](task5_doc/overview.md)
  - [环境要求](task5_doc/env.md)
  - [评分标准](task5_doc/judge.md)
  - [API介绍](task5_doc/API.md)
  - [指令介绍](task5_doc/ins.md)
  - [LLM相关](task5_doc/LLM.md)
  - [参考资料](task5_doc/cite.md)
- Q&A
  - [常见问题与答案](QA.md)
- 致谢
  - [主要贡献者](contributors.md)
```

## 旧项目说明：docs/README.md

旧项目说明正文未做迁移内联备份，原文件继续保留在 docs/README.md，便于后续比对与追溯。