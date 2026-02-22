<!-- <p align="center">
  <img width="512" src="docs/logo/LOGO.svg">
</p> -->

# YatCC: Yat Compiler Course

中山大学[编译课程](https://yatcc-ai.com)。

基于YatCC编译实验内容，中山大学计算机学院与超算中心联合开发了智能编译教学实践平台[YatCC-AI](https://yatcc-ai.com)。YatCC-AI结合国产超算与DeepSeek AI技术，为《编译原理》和《编译器构造实验》课程提供全新的智能化学习体验。平台深度融合高性能计算（HPC）和AI技术，通过云端编译环境、AI辅助开发和实时反馈机制，全面优化实践环节，帮助学生掌握编译技术的核心知识，接触前沿编译技术与应用场景，并提高科研创新能力。

相比传统编译实验，YatCC-AI通过一站式在线集成开发环境和超算原生DeepSeek-R1接入，提供专业知识问答推理（LLM4Chatting）、LLVM代码开发调优（LLM4Coding）、编译前沿方案探索（LLM4Compiling）等全流程智能化教学实践支持。云端代码仓库简化了繁琐的实验环境配置工作，同时统一的实验配置减少了实验环境差异引发的问题。

与此同时，在YatCC还具有如下优势：

- 编程环境：与 CMake 构建系统和 VSCode 编辑器深度结合，提供了涵盖构建、调试、评测、打包的完整解决方案，为同学们带来了现代化的开发体验；
- 项目组织：预置了完整、规范、采用最佳实践的基础示例代码和项目组织结构，大大降低了同学们的上手难度，减少了与课程内容无关的工程量；
- 实验设置：设计了自定义配置机制，允许同学们根据自身情况和偏好选择完成实验的方式，提高了实验的灵活性；
- 实验测例：精简了评测样例，改进了评分脚本，可以提供更加清晰的评测结果，帮助同学们更好地理解实验要求和自己代码的问题；
- 实验文档：根据示例代码重新撰写的“手把手”实验文档言之有物，从而提供了更加具体和清晰的实验指导。

> 目前YatCC仍在持续更新与完善，欢迎老师和同学们使用并提出改进意见和建议。

# 内容

本实验共由 6 个任务组成：

- [任务 0：环境准备](task/0)
- [任务 1：词法分析](task/1)
- [任务 2：语法分析](task/2)
- [任务 3：中间代码生成](task/3)
- [任务 4：中间代码优化](task/4)
- [任务 5：后端代码生成](task/5)

> 到任务各自的目录中查看具体的任务要求。

> （同时面向同学们和实验项目的维护人员）**为了建立对实验框架的整体认知，请阅读[《实验设计手册》](/docs/gyh-manual)。**

# 准备

## 使用 YatCC-AI 在线实验平台

通过浏览器访问 YatCC-AI 云端代码仓库是开始实验的最快方式，具体在线平台使用步骤请参考[这篇文章](https://arcsysu.github.io/YatCC/#/introduction/environment)。

![](./docs/use-ol.gif)

登陆云端代码仓库后，可以通过[AI工具配置](https://arcsysu.github.io/YatCC/#/introduction/aitools)教程中的 Base URL（当前为https://llm.yatcc-ai.com/v1/） 和 API-key（各账号私有）进行 Roo Code 插件配置：

![](./docs/llm-config.gif)

## 使用 GitHub Codespaces

如果你可以使用 GitHub Codespaces：

![](./docs/use-codespaces.gif)

## 在自己的计算机上使用开发容器

你可以在自己的计算机上使用和 GitHub Codespaces 相同的开发容器镜像，[这篇文章](https://arcsysu.github.io/YatCC/#/introduction/environment)介绍了如何拉取并使用它。

## 手动搭建开发环境

如果你不想使用容器而是想直接在自己的 Linux 系统中使用本框架，请使用以下 bash 命令：

```bash
# 安装依赖（以 Ubuntu 24.04 为例）
sudo apt-get update
sudo apt-get install -y build-essential git python3 cmake ninja-build default-jdk bison flex unzip lld libzstd-dev
# 克隆仓库
git clone https://github.com/arcsysu/YatCC.git -b main --single-branch --depth 1
# 进入仓库
cd YatCC
# 准备 ANTLR 与 LLVM
./antlr/setup.sh
./llvm/setup.sh
```

然后，使用 VSCode 打开仓库文件夹，即可开始实验。实验所需的 VSCode 插件已经全部列在 [`.vscode/extensions.json`](.vscode/extensions.json) 中，在打开文件夹时，VSCode 会自动提示你安装这些插件，你只需遵照提示点击安装即可。

> 如果不小心错过了这个提示，你总可以在 VSCode 侧边栏的插件面板中搜索 `@recommended` 看到所有推荐的插件。

# 配置

注意仓库根目录下的 `config.cmake` 文件，这是一个自定义配置文件，你可以根据自己的情况和偏好修改它。至少，你需要在其中填入你的姓名和学号。

通过这个文件，你可以选择实验一和实验二的完成方式：是使用 Bison+Flex 还是 ANTLR，相应地，你的程序也会在我们评测时使用相应的方式运行。

除此之外，你还可以通过它配置第一个之后的每个实验是否“复活”。所谓“复活”，是指将程序的输入由源代码的内容改为前一个实验的标准答案。由于本实验是线性、渐进的，如果你在前一个实验中“挂了”或是做得不够好，那么就可以选择“复活”来同步进度，从而继续后面的实验。

> 复活机制默认关闭

# 开始

现在，你已经准备好了，请按照每个任务的具体要求，开始你的编译器实验之旅吧！

你可以在这里找到更多的参考文档：[arcsysu.github.io/YatCC/](https://arcsysu.github.io/YatCC/)。
