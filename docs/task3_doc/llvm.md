# LLVM 介绍

**LLVM** 是一个用于构建编译器和相关工具的开源基础设施项目。它最初是作为一个静态编译器的后端开发的，但现在已经发展为支持前端、优化器、后端等完整编译流程的模块化系统。LLVM 提供了丰富的 API 和工具，广泛应用于编译器开发、静态分析、代码优化等领域。本次实验中，`llvm::` 前缀的类和函数均为 LLVM 提供的 API。

**LLVM IR** 是 LLVM 的核心中间语言。它是一种类似汇编形式的中间代码，既可以被人类阅读，也便于机器分析和优化。LLVM IR 作为前端和后端之间的桥梁，使得不同语言的前端和不同平台的后端可以灵活组合。

下面的这些关于 LLVM 的资料供同学们参考

[LLVM Lanaguage Reference Manual](https://llvm.org/docs/LangRef.html)

[LLVM Programmers Manual](https://llvm.org/docs/ProgrammersManual.html)

[The Core LLVM Class Hierarchy Reference](https://www.llvm.org/docs/ProgrammersManual.html#id128)

## LLVM IR 结构

对于下份源代码：

```c
// test.c
const int a = 10;
int b = 5;

int main() {
  if(b < a)
    return 1;
  return 0;
}
```

使用 `clang -cc1 -S -emit-llvm test.c` 生成的 LLVM IR 如下：

```llvm
; ModuleID = 'test.c'
source_filename = "test.c"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

@a = constant i32 10, align 4
@b = global i32 5, align 4

; Function Attrs: noinline nounwind optnone
define dso_local i32 @main() #0 {
entry:
  %retval = alloca i32, align 4
  store i32 0, i32* %retval, align 4
  %0 = load i32, i32* @b, align 4
  %cmp = icmp slt i32 %0, 10
  br i1 %cmp, label %if.then, label %if.end

if.then:                                          ; preds = %entry
  store i32 1, i32* %retval, align 4
  br label %return

if.end:                                           ; preds = %entry
  store i32 0, i32* %retval, align 4
  br label %return

return:                                           ; preds = %if.end, %if.then
  %1 = load i32, i32* %retval, align 4
  ret i32 %1
}

attributes #0 = { noinline nounwind optnone "frame-pointer"="none" "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-features"="+cx8,+mmx,+sse,+sse2,+x87" }

!llvm.module.flags = !{!0}
!llvm.ident = !{!1}

!0 = !{i32 1, !"wchar_size", i32 4}
!1 = !{!"clang version 14.0.6"}
```

LLVM IR 文件的基本单元为 **Module**，一个 Module 对应于一个完整的编译单元（Translation Unit）。一般来说，一个 Module 就是一个源代码文件，如一个以 `.c` 为后缀的 C 语言文件，不过也可以将多个 Module 合并为一个 Module（通过 `llvm-link` 工具）。本次实验中均为单文件编译，不涉及 Module 合并。

一个 Module 就是 LLVM IR 的顶层容器，其中包含了:

- **注释**。LLVM IR 中，所有的注释均以分号`;`开头。例如上面 IR 中的`; ModuleID = 'test.c'`即为一句注释，表示模块 ID，编译器据此来区分不同的模块。
- **源文件名**。例如上面 IR 中的`source_filename = "test.c"`。
- **目标平台信息**。
  - `target datalayout` 表示数据布局如大小端存储、对齐方式、整数类型有哪些等等。
  - `target triple`为描述目标平台信息的三元组，一般形式为 `<architecture>-<vendor>-<system>[-extra-info]`。
- 元数据。以感叹号!开头，可以附加到 LLVM IR 的指令和全局对象上，为优化器和代码生成器提供关于代码的额外信息。
- **全局标识符**。均以 `@` 开头，进一步可以分为全局变量和函数。

  - **全局变量**（GlobalVariable）。例如上面 IR 中的`@a = constant i32 10, align 4` 和 `@b = global i32 5, align 4`，其中`align 4` 表示 4 字节对齐。
  - **函数**（Function）。函数定义以 `define` 开头，例如上面 IR 中的`define dso_local i32 @main()`，`i32` 表示函数的返回值为 `int` 类型。函数声明以 `declare` 开头，如 `declare i32 f()`。函数也可以有参数列表，如`define i32 f(i32 %a, i32 %b)`。

    每个函数定义均由若干个**基本块**（BasicBlock）构成。

    - 每一个基本块都有一个在当前函数中唯一的标签，例如在上面的 IR 中，`main()` 函数总共有 4 个基本块，其标签分别为 `entry`、`if.then`、`if.end` 和 `return`。**每个函数执行的第一个基本块一定是标签为 entry 的基本块**，它是函数的入口基本块。所以执行 `main()` 函数时，一定是从 `entry` 基本块开始执行。
    - 每一个基本块中都有若干条指令，且最后一条指令一定是一条 [终结指令](https://llvm.org/docs/LangRef.html#terminator-instructions)，例如上面 IR 中 `return` 基本块的 `ret i32 %1`。

      终结指令还包括分支跳转指令，分支跳转指令又分为有条件跳转和无条件跳转。如`br i1 %cmp, label %if.then, label %if.end`，如果 `%cmp` 为真，则跳转到 `if.then` 基本块，否则跳转到 `if.end` 基本块。无条件跳转，如`br label %return`，直接跳转到 return 基本块。

      一个基本块中的指令一定是从上往下顺序执行的，且一个基本块中的指令要么全都执行，要么全都不执行。

    - 基本块中的局部变量以百分号`%`开头，例如上面 IR 中的 `%cmp`。如果没有为局部变量或者基本块命名，则 LLVM 会自动以无符号数字，按顺序为每个局部变量和基本块编号，如上面的 `%0`和`%1`。

## LLVM 核心类

### llvm::LLVMContext

参考资料：[llvm::LLVMContext Class Reference](https://llvm.org/doxygen/classllvm_1_1LLVMContext.html)

`llvm::LLVMConext` 是一个不透明的对象，它拥有和管理许多核心的 LLVM 数据结构，例如类型和常量值表。**我们不需要详细了解它**，我们只需要直到如何创建该类型的实例，并传递给需要它的 API 即可。

创建一个 `llvm::LLVMConext` 实例非常简单，其[构造函数](https://llvm.org/doxygen/classllvm_1_1LLVMContext.html#a4eb1cb06b47255ef63fa4212866849e1)：

```cpp
#include <llvm/IR/LLVMContext.h>
llvm::LLVMContext TheContext;
```

### llvm::Module

参考资料：[llvm::Module Class Reference](https://llvm.org/doxygen/classllvm_1_1Module.html)

`llvm::Module` 是所有其他 LLVM IR 对象的顶层容器，包含了全局变量、函数、该模块所依赖的库/其他模块、符号表和有关目标平台等各种数据。我们生成的所有 IR 都会储存在这里。

为了创建 LLVM Module 的实例，我们需要表示 Module ID 的字符串以及 `LLVMContext` 的引用，其[构造函数](https://llvm.org/doxygen/classllvm_1_1Module.html#a378f93ece2ac999e500f07056cfe6528)：

```cpp
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
llvm::LLVMContext TheContext;
llvm::Module TheModule("Module ID", TheContext);
```

### llvm::IRBuilder

参考资料：[llvm::IRbuilder Class Reference](https://llvm.org/doxygen/classllvm_1_1IRBuilder.html)

`llvm::Module` 包含了所有生成的 LLVM IR，那么该如何生成 LLVM IR ，或者说如何向 `llvm::Module` 中插入 LLVM IR 呢？这就需要用到 `llvm::IRBuilder` 了。

`llvm::IRBuilder` 用于生成 LLVM IR，其提供了统一的 API 来创建和插入指令到基本块中。我们可以在 `llvm::IRBuilder` 的[构造函数](https://llvm.org/doxygen/classllvm_1_1IRBuilder.html#aa1e284a3ff6e4e6662223ed0b0cdd201)中指定 IR 的插入位置，也可以使用[SetInsertPoint 方法](https://llvm.org/doxygen/classllvm_1_1IRBuilderBase.html#ace45cae6925c65e9d6916e09dd5b17cc)来修改 IR 的插入位置。

```cpp
#include <llvm/IR/IRbuilder.h>
// ====================================================================
// 利用构造函数
// ====================================================================
llvm::BasicBlock *Block = /* 获得 BasicBlock 实例的指针 */;
/// 指定当前IR插入点为 Block 的末尾
llvm::IRBuilder<> TheBuilder(Block);

llvm::Instruction *Inst = /* 获得 IR 指令实例的指针 */;
/// 或者指定当前IR插入点为指令 Inst 之前
llvm::IRBuilder<> TheBuilder(Inst);

// ====================================================================
// 利用 SetInsertPoint 方法
// ====================================================================
/// 指定当前IR插入点为 Block 的末尾
TheBuilder.SetInsertPoint(Block);
/// 或者指定当前IR插入点为指令 Inst 之前
TheBuilder.SetInsertPoint(Inst);
```

创建 `llvm::IRBuilder` 的实例时，也可以不在一开始就指定 IR 插入点，直接将 `LLVMContext` 的引用作为参数传入即可。想要设置 IR 插入点时，再利用 SetInsertPoint 方法：

```cpp
llvm::LLVMContext TheContext;
llvm::Module TheModule("Module ID", TheContext);
llvm::IRBuilder<> TheBuilder(TheContext);
TheBuilder.SetInsertPoint(...);
```

`llvm::IRBuilder`创建 LLVM IR 的接口可以在 [llvm::IRbuilder Class Reference](https://llvm.org/doxygen/classllvm_1_1IRBuilder.html) 中找到，不过 `llvm::IRBuilder` 插入 LLVM IR 的接口基本都继承自 [llvm::IRBuilderBase](https://llvm.org/doxygen/classllvm_1_1IRBuilderBase.html) ，查看 `llvm::IRBuilderBase` 的接口也是可以的。

本次实验中常用的 API，在[LLVM API](task3_doc/apidoc.md)中进行介绍。
