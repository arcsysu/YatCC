# 支持的指令

本框架LLVM IR中支持有如下类型：

- `Return`：返回指令
- `Branch`：条件或无条件跳转指令
- `Alloca`：分配栈内存
- `Store`：存储指令
- `Load`：加载指令
- `Call`：函数调用指令
- `Gep`：指针偏移指令
- `Bitcast`：类型转换指令
- `Ext`：整数扩展指令
- `Binary`：二元运算，加减乘除等
- `Icmp`：整数比较
- `Phi`：Phi跳转

上述是实验过程中会接触到的指令类型，不过出于难度考虑，我们将难度较大的指令选择的实现提供给大家。

# API文档

整个项目的数据结构设计与LLVM极其相似。自上而下分别是 `Module` `Function` `BasicBlock` `Instruction` `Variable`。实现部分在middleEnd文件夹。后端的指令选择部分，我们也将仿照前端的设计，有对应的 `Function_Asm` `Machine_Block` `Machine_Instruction`。下面将介绍本次实验可能会用到的API。

## 遍历指令

`Instruction`存储在 `BasicBlock`中， `BasicBlock`存储在 `Function`中，故遍历 `Instructions`需要层层遍历，一个简单的例子如下：

```cpp
for(auto func : module.globalFunctions) {
	for(auto bb : func->basicBlocks) {
		for(auto ins : bb->instructions) {
			...
		}
	}
}
```

## 操作数相关

Machine_IR中的操作数与IR中操作数有较大的区别，为了方便，我们创建了 `MOperand`结构体专门存储Machine_IR中相关操作数。

**make_operand**

- 参数
  - `v`:  原值
  - `mb`: 所属的machine_block
  - `no_imm`: 是否为立即数
- 作用
  - 用于对前端数据结构中ValuePtr进行转换，替换成对应的ARM操作数

**make_vreg**

- 参数
  - `vreg_index`: 虚拟寄存器编号（防止重复）
- 作用
  - 创建虚拟寄存器操作数

**make_imm**

- 参数
  - `constant`: 原值
- 作用
  - 创建立即数（作为辅助函数，部分时候不能直接使用，详见make_ror_imm）

**make_ror_imm**

- 参数
  - `constant`:原立即数
  - `mb`: 所属的machine_block
- 作用
  - 创建立即数操作数，如果常量无法通过循环右移表示，则加载到虚拟寄存器中。

arm指令集中的立即数使用12位表示，为了在12位中能够表示更大范围的立即数，arm使用循环右移编码方式，低8位为imm8，高4位为rotate。arm规定了rotate一定为偶数，因此实际的旋转量为rotate * 2，最终的立即数表示`imm32 = ROR(imm8, rotate * 2)` ，其中ROR为旋转右移，即将二进制数右移并将溢出的位重新放到最左边，比如0x80经过 `rotate * 2 = 8` 的旋转右移后，结果为0x80000000。

### 插入指令

**Machine_Block :: push**

- 参数
  - `mi`: 压入的指令
- 作用
  - 将指令插入到Machine_Block末尾

**insert**

- 参数
  - `mi`: 插入的指令
  - `before`: 插入位置
- 作用
  - 在before指令前插入指令

### 常用数据结构

**Branch_Condition**

存储条件分支指令的类型，包括

- NO_CONDITION
- LESS_THAN
- NOT_EQUAL
- ……

**MOperand**

Machine_IR的操作数结构体，包括

- `value`: 操作数的int值
- `tag`: 操作数的类型标识