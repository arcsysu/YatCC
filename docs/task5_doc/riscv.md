# RV64 指令集参考

本文档围绕 `EmitMIR.cpp` 中涉及的 RV64 指令展开，帮助你理解填空所需的指令语义。

## 1 RV64 概览

### 1.1 设计哲学

RISC-V 是一套开放标准的 RISC 指令集架构，核心特点：

- **Load-Store 架构** — 所有算术/逻辑运算只在寄存器之间进行，访存必须通过专门的 load/store 指令。
- **本实验涉及的基础指令采用固定 32 位编码** — 解码逻辑非常规整。
- **x0 恒为 0** — 硬连线到常数 0，读它永远得到 0，写它没有效果。这个设计省掉了大量"清零"和"比较是否为 0"的特殊指令。

### 1.2 寄存器

RV64 有 32 个 64 位通用寄存器 `x0`–`x31`，在 ABI 中有各自的名字和用途：


| 寄存器     | ABI 名  | 用途                        |
| ------- | ------ | ------------------------- |
| x0      | zero   | 恒为 0                      |
| x1      | ra     | 返回地址                      |
| x2      | sp     | 栈指针                       |
| x3      | gp     | 全局指针                      |
| x4      | tp     | 线程指针                      |
| x5–x7   | t0–t2  | 临时寄存器（caller-saved）       |
| x8      | s0/fp  | 保存寄存器 / 帧指针（callee-saved） |
| x9      | s1     | 保存寄存器（callee-saved）       |
| x10–x17 | a0–a7  | 函数参数 & 返回值（caller-saved）  |
| x18–x27 | s2–s11 | 保存寄存器（callee-saved）       |
| x28–x31 | t3–t6  | 临时寄存器（caller-saved）       |


本实验框架中，函数参数通过 `a0`–`a7` 传入（超过 8 个参数走栈），返回值放在 `a0`。Prologue 会把 `ra` 和 `s0` 保存到栈上，Epilogue 恢复后再返回。

### 1.3 指令编码格式

RV64 的指令分六种编码格式，不需要记住每一位的位置，只要知道每种格式的操作数结构：


| 格式  | 操作数              | 典型指令          |
| --- | ---------------- | ------------- |
| R   | rd, rs1, rs2     | ADD, SUB, SLT |
| I   | rd, rs1, imm12   | ADDI, LW, LD  |
| S   | rs1, rs2, imm12  | SW, SD        |
| B   | rs1, rs2, offset | BEQ, BNE      |
| U   | rd, imm20        | LUI, AUIPC    |
| J   | rd, offset       | JAL           |


本实验中你不需要直接构造二进制编码，框架用 `emitMC(opcode, {operands...})` 把操作数交给 LLVM 的 MCInst 去处理。你需要关心的是"选哪条指令、操作数怎么填"。

## 2 算术指令

### ADD — 寄存器加法

```
ADD rd, rs1, rs2        # rd = rs1 + rs2
```

R 格式，三个寄存器操作数。对应框架中的 `emitVAdd`。

### SUB — 寄存器减法

```
SUB rd, rs1, rs2        # rd = rs1 - rs2
```

R 格式。注意 RISC-V 没有 `SUBI` 指令，如果想减一个常数，用 `ADDI rd, rs1, -imm`。对应 `emitVSub`。

### ADDI — 加立即数

```
ADDI rd, rs1, imm       # rd = rs1 + sign_extend(imm)
```

I 格式，立即数 12 位有符号，范围 -2048 ~ 2047。

这条指令在框架中被大量复用：

- **加载小常数**：`ADDI rd, x0, imm` — 因为 x0 恒为 0，所以效果是 `rd = imm`。框架中 `emitVLoadImm` 就是这个。
- **寄存器复制**：`ADDI rd, rs, 0` — 相当于 `mv rd, rs`。框架中 `emitVMov` 用的就是这个。
- **地址计算**：`ADDI rd, sp, offset` — 计算栈上对象的地址。

### MUL — 乘法

```
MUL rd, rs1, rs2        # rd = (rs1 × rs2)[63:0]
```

R 格式，取乘积的低 64 位。属于 RV64M 扩展。对应 `emitVMul`。

### DIV — 有符号除法

```
DIV rd, rs1, rs2        # rd = rs1 ÷ rs2（有符号，向零取整）
```

R 格式，属于 M 扩展。除以 0 时结果为 -1（不产生异常）。对应 `emitVDiv`。

### REM — 有符号取余

```
REM rd, rs1, rs2        # rd = rs1 % rs2（有符号）
```

R 格式，属于 M 扩展。结果的符号与被除数相同。对应 `emitVRem`。

## 3 位运算与逻辑指令

### AND / OR / XOR — 寄存器位运算

```
AND rd, rs1, rs2        # rd = rs1 & rs2
OR  rd, rs1, rs2        # rd = rs1 | rs2
XOR rd, rs1, rs2        # rd = rs1 ^ rs2
```

都是 R 格式。对应 `emitVAnd`、`emitVOr`、`emitVXor`。

### XORI — 异或立即数

```
XORI rd, rs1, imm       # rd = rs1 ^ sign_extend(imm)
```

I 格式。在本实验中最常见的用法是 `XORI rd, rs, 1`，即对一个 0/1 值取反。对应 `emitVXori`。

## 4 移位指令

移位指令分"寄存器给位数"和"立即数给位数"两套：

### 寄存器版

```
SLL rd, rs1, rs2        # rd = rs1 << rs2[5:0]       逻辑左移
SRL rd, rs1, rs2        # rd = rs1 >> rs2[5:0]       逻辑右移（高位补 0）
SRA rd, rs1, rs2        # rd = rs1 >> rs2[5:0]       算术右移（高位补符号位）
```

移位量只取 rs2 的低 6 位（因为 64 位寄存器最多移 63 位）。

### 立即数版

```
SLLI rd, rs1, shamt     # rd = rs1 << shamt
SRLI rd, rs1, shamt     # rd = rs1 >> shamt           逻辑右移
SRAI rd, rs1, shamt     # rd = rs1 >> shamt           算术右移
```

shamt 是 6 位无符号立即数（0–63）。

### 逻辑右移 vs 算术右移

这个区别在处理负数时非常关键：

```
假设 rs1 = 0xFFFFFFFF_80000000（一个负数）

SRL: 高位补 0 → 右移 4 位得到 0x0FFFFFFF_F8000000
SRA: 高位补符号位 → 右移 4 位得到 0xFFFFFFFF_F8000000
```

LLVM IR 中 `lshr` 对应逻辑右移（SRL/SRLI），`ashr` 对应算术右移（SRA/SRAI）。填空时务必对应正确。

## 5 比较指令

RISC-V 没有 ARM 那样的状态寄存器（CPSR）和条件码（N/Z/C/V）。比较的结果直接写成 0 或 1 到目标寄存器里。

### SLT — 有符号小于比较

```
SLT rd, rs1, rs2        # rd = (rs1 < rs2) ? 1 : 0   有符号比较
```

### SLTU — 无符号小于比较

```
SLTU rd, rs1, rs2       # rd = (rs1 < rs2) ? 1 : 0   无符号比较
```

### SLTIU — 无符号小于立即数比较

```
SLTIU rd, rs1, imm      # rd = (rs1 < imm) ? 1 : 0   无符号比较
```

特别地，`SLTIU rd, rs, 1` 的含义是"rs < 1（无符号）"，即"rs 是否等于 0"。框架中用它来实现 `icmp eq`。

### 从 SLT/SLTU 组合出所有比较谓词（重要）

LLVM 的 `icmp` 有十种整数比较谓词。RV64 只提供了"小于"两条指令，其余都靠组合：


| icmp 谓词 | 实现方式                                      | 思路         |
| ------- | ----------------------------------------- | ---------- |
| `eq`    | `XOR tmp, lhs, rhs` → `SLTIU dst, tmp, 1` | 差为 0 则相等   |
| `ne`    | `XOR tmp, lhs, rhs` → `SLTU dst, x0, tmp` | 差不为 0 则不等  |
| `slt`   | `SLT dst, lhs, rhs`                       | 直接用        |
| `sgt`   | `SLT dst, rhs, lhs`                       | 交换操作数      |
| `sle`   | `SLT tmp, rhs, lhs` → `XORI dst, tmp, 1`  | 不大于 = 大于取反 |
| `sge`   | `SLT tmp, lhs, rhs` → `XORI dst, tmp, 1`  | 不小于 = 小于取反 |
| `ult`   | `SLTU dst, lhs, rhs`                      | 直接用        |
| `ugt`   | `SLTU dst, rhs, lhs`                      | 交换操作数      |
| `ule`   | `SLTU tmp, rhs, lhs` → `XORI dst, tmp, 1` | 不大于取反      |
| `uge`   | `SLTU tmp, lhs, rhs` → `XORI dst, tmp, 1` | 不小于取反      |


这张表是 `emitICmpInst` 填空的核心参考。

## 6 访存指令

### LD / SD — 8 字节读写

```
LD rd, offset(rs1)      # rd = Memory[rs1 + offset]，读 8 字节
SD rs2, offset(rs1)     # Memory[rs1 + offset] = rs2，写 8 字节
```

offset 是 12 位有符号立即数。框架中 `emitVLoad` 和 `emitVStore` 把 offset 固定写成 0，地址直接由寄存器给出。

### LW / SW — 4 字节读写

```
LW rd, offset(rs1)      # rd = sign_extend(Memory[rs1 + offset][31:0])
SW rs2, offset(rs1)     # Memory[rs1 + offset][31:0] = rs2[31:0]
```

注意 `LW` 会对读出的 32 位值做符号扩展到 64 位。对应 `emitVLoad32` 和 `emitVStore32`。

在本实验中，`i32` 类型（4 字节）走 LW/SW，其余走 LD/SD。

## 7 控制流相关

本实验的控制流不直接对应单条 RV64 指令，而是用框架中的 `VInst` 抽象来表示：


| VInst::Kind | 含义                         | 后续由 emitter 展开为                                 |
| ----------- | -------------------------- | ----------------------------------------------- |
| `kBrUncond` | 无条件跳转                      | `JAL x0, label`（即 `j label`）                    |
| `kBrCond`   | 条件跳转（cond != 0 或 == 0 时跳转） | `BNE/BEQ cond, x0, label`                       |
| `kCall`     | 函数调用                       | 参数搬到 a0–a7 + `call label`（汇编器伪指令，展开为 `AUIPC+JALR`，目标足够近时也可能松弛为 `JAL`） |
| `kRet`      | 函数返回                       | 返回值搬到 a0 + epilogue + `JALR x0, ra, 0`（即 `ret`） |


填空部分不涉及控制流指令的直接构造，但 `emitBranchInst` 和 `emitReturnInst` 已经实现好了，理解它们有助于把握整体流程。
