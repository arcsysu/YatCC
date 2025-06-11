# LLM实验流程

## 第一步

修改task/5/main.cpp

- 填入API key和Base URL
- 传入IR地址以及输出地址（无需处理，助教已写好传入逻辑）

![image.png](../images/api-key.png)

## 第二步

修改task/5/llm/prompts/*.xml

- Ir2Asm*xml：本次实验需要补充的Prompts
  - SysPrompts：设定角色，规定输入输出格式，传入先验知识等
  - UserPrompts：传入IR代码等

## 第三步

在CMake界面编译运行

- 助教已写好编译逻辑，可一键同时执行传统路径以及LLM路径

## Prompt技巧

- 将完整的任务拆分成许多小任务，一步步引导LLM回答
- 需要补充IR中缺乏的信息
  - 目标汇编的信息（ARM？X86？64位？32位？）
  - 一些必要的伪代码（.text字段等）
- 规定好输出格式（防止出现非法符号）