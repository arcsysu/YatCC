# 实验介绍

<div class="quote-card">
	<p class="quote-card__eyebrow">Task 3 · 中间代码生成 / Intermediate Representation</p>
	<p class="quote-card__text">&quot;All problems in computer science can be solved by another level of indirection.&quot;</p>
	<p class="quote-card__translation">（计算机科学中的所有问题，都可以通过增加一个间接层来解决。）</p>
	<p class="quote-card__author">David Wheeler</p>
</div>

!!! note "从最小测例出发，逐步扩展语言特性"

		task3-answer 是最有价值的参照物。先让最简单的 main、return、常量与表达式路径稳定，再一点点把变量、数组、控制流补齐。

## 任务描述

恭喜同学们完成了前面两个实验！在实验一中，我们实现了一个词法分析器，将源代码文件输入词法分析器后，将会产生 token 流。在实验二中，我们实现了一个语法分析器，读取词法分析器输出的 token 流，最终输出 JSON 格式的 AST。

在本次实验中，大家将要完成一个中间代码生成器。生成器会读入代表 AST 的 JSON 文件（也即实验二的输出），生成 ASG，然后再根据 ASG，调用 LLVM 库生成 LLVM IR（本次实验中，IR 是可读的汇编文本格式，保存在 `.ll`后缀文件中）：

!!! tip "优先打通最短路径"

	最推荐的做法是先让最简单的函数生成合法 LLVM IR，再逐类加入表达式、变量、数组和控制流。
	一次性并行补很多分支，通常会让错误来源变得很难判断。

![workflow](../images/task3/framework.png)

同学们在进行实验的过程中，可以构建目标 `task3-answer` ，参考其生成的标准答案，逐步改进自己的代码。从实验三开始，大家将逐渐体会到 LLVM 库的强大。

!!! warning "不要一上来同时补齐所有节点类型"

	IR 生成最怕的是路径一多，错误来源就混在一起。建议始终围绕“一个测例、一类节点、一段输出”地推进。
	每补完一类结构，就先用 task3-answer 对比一次，再继续扩展。

---

task3 的目录结构如下：

```text
task3/
├─ Obj.hpp
├─ Obj.cpp
├─ asg.hpp
├─ asg.cpp
├─ Json2Asg.hpp
├─ Json2Asg.cpp
├─ EmitIR.hpp
├─ EmitIR.cpp
└─ main.cpp
```

- `Obj.hpp/cpp`，`asg.hpp/cpp`：这四个文件已经在实验二的[公用代码介绍](../task2_doc/share.md)中详细说明过了，这里不再赘述。

- `Json2Asg.hpp/cpp`：这两个文件实现了 `Json2Asg` 类。这个类的功能是读取 JSON 文件（ `llvm::json::Value` ），输出 ASG（`asg::TranslationUnit`）。助教们已经实现了这个类，同学们无需修改。

- `EmitIR.hpp/cpp`：这两个文件用于实现 `EmitIR` 类。这个类的的功能是读取抽象语义图，即 `Json2Asg` 输出的 `asg::TranslationUnit`，然后根据其来生成 LLVM IR。助教们已经实现了这个类的基本功能，使目前的实验三代码仅仅能够通过 `functional-0/000_main.sysu.c` 这个测例。

- `main.cpp`：这个文件是实验三中间代码生成器的程序入口，负责创建 `Json2Asg` 实例读取 JSON 文件并生成 `asg::TranslationUnit` ，然后传给 `EmitIR` 实例生成 LLVM IR，最后输出到指定文件中。这个文件也无需修改。

总结一下，在实验三中，同学们需要仔细阅读实验文档，并完善 `EmitIR` 类（主要是修改补充 `EmitIR.hpp` 和 `EmitIR.cpp`），以确保能够通过所有测试用例，实现一个完整的中间代码生成器。在此过程中，同学们将会使用到很多 LLVM API，可以查阅[实验文档](../task3_doc/apidoc.md)，必要时借助大模型等工具，深入了解相关 API 的使用方法。

!!! tip "把输出 IR 当成第一调试现场"

	很多 task3 问题不是运行时报出来的，而是在生成的 `.ll` 文件里就已经能看见端倪。
	优先检查函数签名、基本块结构、返回值和类型是否符合预期，通常比盲目单步更快。

## 评分标准

LLVM IR 是可以通过 LLVM 的工具 `lli` 被直接执行的，如 `lli output.ll`。

实验三的评分只考虑同学们生成的 LLVM IR 的正确性，**对于一个编译器而言，程序的正确性是必然的**。对于每个测例，同学们生成的 LLVM IR 不必与 task3-answer 生成的标准答案（也即 clang 输出的 LLVM IR）完全相同，只要你生成的 LLVM IR 执行后，程序的返回值和输出与 clang 生成的 LLVM IR 执行后的返回值和输出相同，就算通过了该测例。

所有样例通过后，就拿到了满分！

## 注意事项

（**可能过时，仅供参考**）

如果测评机与本地结果不一样，可能是局部变量没有初始化。例如 `EmitIR` 类的成员变量 `mCurFunc` 没有在构造函数中设置为 `nullptr`，导致其在被赋值前为野指针。

!!! danger "成员状态没有初始化时，问题会非常隐蔽"

	Task3 开始对象状态显著变多，未初始化成员、悬空引用和类型不一致都会表现成很绕的后果。
	如果出现“本地偶现”“测评机不稳定”这类症状，先回头检查对象生命周期和默认值。
