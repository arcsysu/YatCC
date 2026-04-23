# API 速查

填空时会频繁用到以下函数，这里做一个快速索引。

## 核心辅助函数

| 函数                                   | 作用                                        |
| ------------------------------------ | ----------------------------------------- |
| `emitLoadValue(v)`                   | 把 LLVM Value 变成可用的虚拟寄存器（常量会先 load 进临时寄存器） |
| `vregOf(v)`                          | 查找 LLVM Value 对应的虚拟寄存器                    |
| `nextTempVReg()`                     | 取一个临时虚拟寄存器，用于中间计算                         |

## 指令生成函数

### 算术运算

| 函数          | 对应指令 | 说明          |
| ----------- | ---- | ----------- |
| `emitVAdd`  | ADD  | 寄存器加法       |
| `emitVSub`  | SUB  | 寄存器减法       |
| `emitVMul`  | MUL  | 乘法          |
| `emitVDiv`  | DIV  | 有符号除法       |
| `emitVRem`  | REM  | 有符号取余       |

### 位运算

| 函数          | 对应指令 | 说明       |
| ----------- | ---- | -------- |
| `emitVAnd`  | AND  | 按位与      |
| `emitVOr`   | OR   | 按位或      |
| `emitVXor`  | XOR  | 按位异或     |
| `emitVXori` | XORI | 异或立即数    |

### 移位

| 函数           | 对应指令 | 说明           |
| ------------ | ---- | ------------ |
| `emitVSll`   | SLL  | 逻辑左移（寄存器）   |
| `emitVSrl`   | SRL  | 逻辑右移（寄存器）   |
| `emitVSra`   | SRA  | 算术右移（寄存器）   |
| `emitVSlli`  | SLLI | 逻辑左移（立即数）   |
| `emitVSrli`  | SRLI | 逻辑右移（立即数）   |
| `emitVSrai`  | SRAI | 算术右移（立即数）   |

### 比较

| 函数           | 对应指令  | 说明          |
| ------------ | ----- | ----------- |
| `emitVSlt`   | SLT   | 有符号小于比较    |
| `emitVSltu`  | SLTU  | 无符号小于比较    |
| `emitVSltiu` | SLTIU | 无符号小于立即数比较 |

### 访存

| 函数              | 对应指令 | 说明       |
| --------------- | ---- | -------- |
| `emitVLoad`     | LD   | 8 字节读取   |
| `emitVStore`    | SD   | 8 字节写入   |
| `emitVLoad32`   | LW   | 4 字节读取   |
| `emitVStore32`  | SW   | 4 字节写入   |

### 常用工具

| 函数                         | 对应指令              | 说明         |
| -------------------------- | ----------------- | ---------- |
| `emitVLoadImm(dst, imm)`  | `ADDI dst, x0, imm` | 加载立即数      |
| `emitVMov(dst, src)`      | `ADDI dst, src, 0`  | 寄存器复制      |

## 类型查询

| 函数                          | 作用           |
| --------------------------- | ------------ |
| `dl_.getTypeAllocSize(ty)`  | 获取类型占用的字节数   |
