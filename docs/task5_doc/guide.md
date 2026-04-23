## 填空导读

`EmitMIR.cpp` 中有四处 `TODO: Student Implementation`，下面逐一说明思路。

### 1 emitBinary — 二元运算

需要做的事：把 LLVM IR 的二元运算翻译成对应的 RV64 指令。

**基本步骤**

1. 用 `emitLoadValue` 取出左右操作数，用 `vregOf` 拿到目标寄存器。
2. 按 `bo.getOpcode()` 做 switch 分发。

**各 opcode 的对应关系**


| LLVM opcode | RV64 辅助函数  |
| ----------- | ---------- |
| `Add`       | `emitVAdd` |
| `Sub`       | `emitVSub` |
| `Mul`       | `emitVMul` |
| `SDiv`      | `emitVDiv` |
| `SRem`      | `emitVRem` |
| `And`       | `emitVAnd` |
| `Or`        | `emitVOr`  |
| `Xor`       | `emitVXor` |


**移位需要额外处理**

`Shl`、`LShr`、`AShr` 三种移位的右操作数可能是编译期常量。如果是常量，优先用立即数版本（`emitVSlli` / `emitVSrli` / `emitVSrai`），否则用寄存器版本（`emitVSll` / `emitVSrl` / `emitVSra`）。

判断方法：对 `bo.getOperand(1)` 做 `dyn_cast<ConstantInt>`，如果成功就拿 `getSExtValue()` 作为立即数。

**别忘了 default 分支**

对不支持的 opcode 调用 `llvm::report_fatal_error`，不要静默忽略。

### 2 emitICmpInst — 整数比较

需要做的事：把 LLVM IR 的 `icmp` 翻译成 0/1 结果。

**基本步骤**

1. 用 `emitLoadValue` 取左右操作数，`vregOf` 拿目标寄存器。
2. 用 `nextTempVReg()` 拿一个临时寄存器。
3. 按 `ci.getPredicate()` 做 switch 分发，对照 [比较指令组合表](riscv.md#从-sltsltu-组合出所有比较谓词重要) 实现。

**关键点**

- `ICMP_EQ`：先 XOR 求差，再 `SLTIU dst, tmp, 1` 判断差是否为 0。
- `ICMP_NE`：先 XOR 求差，再 `SLTU dst, x0, tmp` 判断差是否非 0。这里用到了 `x0` 寄存器（`llvm::RISCV::X0`）。
- `ICMP_SGT`：交换操作数后用 SLT — `SLT dst, rhs, lhs`。
- `ICMP_SLE` / `ICMP_SGE`：先做严格比较，再用 `XORI dst, tmp, 1` 取反。
- 无符号版本（`ICMP_ULT` 等）把 SLT 换成 SLTU，逻辑完全对称。

### 3 emitLoadInst — load 指令

需要做的事：从内存地址读取值到寄存器。

**基本步骤**

1. 用 `emitLoadValue` 取出地址操作数（`li.getPointerOperand()`）。
2. 用 `vregOf` 拿目标寄存器。
3. 用 `dl_.getTypeAllocSize(li.getType())` 拿到被读取类型的大小。
4. 如果大小是 4 字节，调用 `emitVLoad32`；否则调用 `emitVLoad`。

就这么多，非常直接。

### 4 emitStoreInst — store 指令

需要做的事：把值写回内存地址。

**基本步骤**

1. 用 `emitLoadValue` 分别取出值（`si.getValueOperand()`）和地址（`si.getPointerOperand()`）。
2. 用 `dl_.getTypeAllocSize` 拿到值类型的大小。
3. 如果大小是 4 字节，调用 `emitVStore32`；否则调用 `emitVStore`。

与 load 的宽度选择保持对称。
