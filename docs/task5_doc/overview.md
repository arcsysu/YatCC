# 整体介绍

本文档面向 Task5 ，围绕 `EmitMIR.cpp` 中涉及的 RV64 指令展开，帮助你理解填空所需的指令语义。

## 0 环境准备
请执行根目录的 `task5_setup.sh` 更新实验环境

## 1 任务描述

打开 `task/5/EmitMIR.cpp`，找到下面这对标记：

```cpp
/*
-------------------------------------------------------------
TASK 5 START
-------------------------------------------------------------
*/

  ...（需要你实现的函数）

/*
-------------------------------------------------------------
TASK 5 END
-------------------------------------------------------------
*/
```

在这两个标记之间有四个函数，每个函数体里都是一句 `llvm::report_fatal_error("TODO: Student Implementation")`，你需要把它们替换成正确的实现：


| 函数              | 职责                                        |
| --------------- | ----------------------------------------- |
| `emitBinary`    | 把 LLVM IR 的二元运算（加减乘除余、位运算、移位）翻译成 RV64 MIR |
| `emitICmpInst`  | 把 LLVM IR 的整数比较翻译成 0/1 结果                 |
| `emitLoadInst`  | 把 LLVM IR 的 load 翻译成 LD 或 LW              |
| `emitStoreInst` | 把 LLVM IR 的 store 翻译成 SD 或 SW             |


这四个函数以外的代码已经写好，包括函数序言/尾声、分支跳转、函数调用、PHI 处理、GEP 地址计算等。你不需要修改标记范围外的任何内容。

每个函数上方都有详细的注释提示，描述了推荐的实现步骤和需要注意的边界情况。建议先通读一遍这些注释再动手。

填空完成后，框架会把你生成的 MIR 交给寄存器分配器和汇编输出器，最终产出 `.s` 汇编文件。评测只看最终二进制的运行结果是否正确，不限制你选择哪些具体指令。

## 2 LLVM 后端导读

在动手填空之前，值得花几分钟理解整条后端流水线是怎么串起来的。不需要记住所有细节，但知道"我填的代码在哪个阶段、上游给了什么、下游期望什么"会让实现更有方向感。

### 2.1 从 LLVM IR 到汇编：全景

一段 C 源码经过前端和中端处理后，到达后端时是 LLVM IR 的形式。后端要做的事情可以粗略分成四步：

```
LLVM IR  →  指令选择  →  寄存器分配  →  汇编输出
            (需要填写)  (框架已实现)    (框架已实现)
```

1. **指令选择（Instruction Selection）** — 把平台无关的 IR 指令翻译成平台相关的机器指令。比如 LLVM IR 里的 `add i32 %a, %b` 会变成 RV64 的 `ADD` 指令。这一步操作数还是虚拟寄存器，不涉及物理寄存器的分配。你要填的四个函数就在这一步。
2. **寄存器分配（Register Allocation）** — 把虚拟寄存器映射到物理寄存器（a0–a7、t0–t6、s0–s11 等）。如果虚拟寄存器的数量超过了物理寄存器的数量，分配器会把一些值溢出（spill）到栈上。本框架用的是线性扫描分配器（`LinearScanAllocator`），已经实现好了。
3. **汇编输出（Assembly Emission）** — 把分配好物理寄存器的 MIR 指令转成文本汇编。遇到溢出的虚拟寄存器时，输出器会自动插入 load/store 来访问栈槽。`RvInstEmitter` 负责这一步。

### 2.2 Machine IR 是什么

在本框架中，Machine IR（MIR）用 `VInst` 结构体表示。它是 LLVM IR 和最终汇编之间的中间层：

```
LLVM IR 指令         Machine IR (VInst)           最终汇编
add i32 %a, %b  →   ADD vreg3, vreg1, vreg2  →   add a0, t1, t2
```

一个 `VInst` 有两种角色：

- `**Kind::kMC**` — 包装了一条 `MCInst`（LLVM 的机器指令表示），记录了 opcode 和操作数。这是最常见的类型，你填空时生成的大部分指令都是这种。
- `**Kind::kCall` / `kRet` / `kBrUncond` / `kBrCond**` — 控制流相关的高层抽象。它们不直接对应单条机器指令，而是由后面的 `RvInstEmitter` 展开成具体的参数搬运、跳转指令和函数序言/尾声。

### 2.3 虚拟寄存器

你在填空中会大量接触虚拟寄存器。它们的生命周期是这样的：

1. **创建** — 函数开始翻译前，`computeFrameLayoutBase` 给每个 LLVM SSA 值（参数和指令）分配一个虚拟寄存器，同时在栈上预留一个溢出槽。
2. **使用** — 你在 `emitBinary` 等函数中，通过 `vregOf(&inst)` 拿到指令对应的虚拟寄存器作为目标，通过 `emitLoadValue(operand)` 拿到操作数对应的虚拟寄存器。
3. **分配** — `LinearScanAllocator::allocate` 遍历当前基本块的所有 VInst，建立活跃区间，然后做线性扫描分配。当前实现采用"全部溢出"策略（`forceSpillAll_ = true`），即每个虚拟寄存器都通过栈槽来传递值。
4. **输出** — `RvInstEmitter::emit` 在输出每条指令时，把虚拟寄存器替换成物理寄存器（或插入 load/store 来访问栈槽）。

你不需要操心第 3、4 步，但理解这个流程有助于解释"为什么我的代码看起来在用无限个寄存器却能跑通"。

### 2.4 emitMC — 生成 MIR 的统一入口

所有指令选择最终都调用 `emitMC`：

```cpp
void emitMC(unsigned opcode, SmallVector<MCOperand, 4> ops, std::string sym = {});
```

它做三件事：创建一个 `VInst`，设好 opcode 和操作数，然后 push 到当前基本块的指令列表 `insts_` 里。

框架在 `emitMC` 之上封装了一系列 `emitV*` 辅助函数（`emitVAdd`、`emitVSub` 等），每个对应一条 RV64 指令。填空时直接调用这些辅助函数就行，不需要自己拼 MCOperand。

### 2.5 整体调用链

把上面的内容串起来，一个函数的翻译流程是：

```
emitFunction(f)
  │
  ├─ emitPrologue()           # 输出函数序言（直接写汇编）
  ├─ spillIncomingArgs(f)     # 把参数寄存器写回栈槽
  │
  └─ 对每个 BasicBlock:
       ├─ emitInst(inst)      # 按指令类型分发
       │    ├─ emitBinary()        ← 你填的
       │    ├─ emitICmpInst()      ← 你填的
       │    ├─ emitLoadInst()      ← 你填的
       │    ├─ emitStoreInst()     ← 你填的
       │    ├─ emitCallInst()      # 已实现
       │    ├─ emitReturnInst()    # 已实现
       │    ├─ emitBranchInst()    # 已实现
       │    └─ ...
       │
       ├─ ra.allocate(insts_)      # 寄存器分配
       └─ emitter.emit(insts_)    # 输出汇编
```

你填的四个函数产出的 VInst 会被收集到 `insts_` 里，然后统一交给寄存器分配和汇编输出。每个基本块独立走一轮这个流程。
