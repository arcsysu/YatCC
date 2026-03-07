# YatCC 实验文档门户

<div class="portal-hero">
  <p class="portal-kicker">Compiler Systems · LLVM · AI-Native Learning</p>
  <h1>从环境准备到后端代码生成，一站式进入 YatCC 编译实验</h1>
  <p class="portal-lead">
    这里不是简单的文档首页，而是实验入口。你可以从实验指引快速完成环境、评测与 AI 工具配置，也可以直接进入 Task0 到 Task5 的完整实验内容。
  </p>
  <div class="portal-actions">
    <a class="md-button md-button--primary" href="introduction/index/">进入实验指引</a>
    <a class="md-button" href="labs/index/">浏览实验内容</a>
    <a class="md-button" href="home/project/">查看项目介绍</a>
  </div>
</div>

## 三个入口

<div class="grid cards portal-cards" markdown>

-   :material-home-variant-outline:{ .lg .middle } __主页__

    ---

    查看项目背景、课程定位、常见问题与文档贡献信息，适合第一次了解 YatCC 的读者。

    [进入主页区](home/project/)

-   :material-compass-outline:{ .lg .middle } __实验指引__

    ---

    汇总环境配置、框架使用、评测方式、自动评测平台、AI 助手与提示工程，是正式做实验前的准备区。

    [进入实验指引](introduction/index/)

-   :material-flask-outline:{ .lg .middle } __实验内容__

    ---

    直接进入 Task0 到 Task5 的完整实验正文。每个 Task 都保留完整子目录，适合按实验顺序推进。

    [进入实验内容](labs/index/)

</div>

## 推荐路径

<div class="grid cards portal-flow" markdown>

-   __第一次接触实验__

    ---

    1. [环境配置](introduction/environment.md)
    2. [实验框架使用方法](introduction/howtouse.md)
    3. [最终评测方式说明](introduction/finalscore.md)

-   __需要 AI 辅助__

    ---

    1. [AI 工具使用方法](introduction/agent.md)
    2. [AI 平台配置补充](introduction/aitools.md)
    3. [大模型提示工程](introduction/prompt.md)

-   __直接做实验__

    ---

    1. [Task0：环境准备](task0_doc/task0.md)
    2. [Task1：词法分析](task1_doc/overview.md)
    3. [Task2：语法分析](task2_doc/overview.md)

</div>

## 实验路线图

| 阶段 | 目标 | 对应文档 |
| --- | --- | --- |
| 准备阶段 | 配环境、理解实验流程、接入评测与 AI 工具 | [实验指引](introduction/index/) |
| 前端阶段 | 词法分析与语法分析 | [Task1](task1_doc/overview.md)、[Task2](task2_doc/overview.md) |
| 中端阶段 | LLVM IR 生成与优化 | [Task3](task3_doc/overview.md)、[Task4](task4_doc/overview.md) |
| 后端阶段 | 指令生成与评分对接 | [Task5](task5_doc/overview.md) |

## 你现在可以从这里开始

- 如果你还没准备环境，先看 [实验指引总览](introduction/index/)。
- 如果你已经完成基础准备，直接进入 [实验内容总览](labs/index/)。
- 如果你想先理解项目定位，再读 [项目介绍](home/project/)。