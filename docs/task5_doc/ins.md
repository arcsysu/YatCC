# 指令介绍

这部分会介绍同学们在本次实验中需要补充的指令的详细信息。

## Mov指令

用于**将一个值移动（赋值）到一个寄存器中**，本质上是复制操作，而不是"移动"原始值的意思（源值不变）。这个并不被LLVM IR支持，所以在IR中没有对应的指令。

### ARM示例

- 指令格式：

  ```
  MOV <Rd>, <Operand2>
  ```

  - `<Rd>`：目标寄存器
  - `<Operand2>`：源操作数（寄存器或立即数）

- 功能说明：

  将一个值复制到目标寄存器中

- 示例：

  ```
  MOV R0, #5    ; 将立即数 5 赋值给 R0
  ```

### Machine_IR存储方式

存储在MI_Move，在Machine IR中，mov指令主要保存源头以及目的地。

- `dst`: 存储目标操作数
- `src`: 存储源操作数

## Branch指令

br 是 LLVM 中的 **无条件** 或 **条件跳转** 指令，用于从一个基本块跳转到另一个基本块。

### IR示例

**条件跳转**

- 指令格式：

  ```
  br <cond>, <true_label>, <false_label>
  ```

  - `br` : 指令类型
  - `<cond>` : 判断条件
  - `<true_label>`: 条件为True时的跳转块
  - `<false_label>`: 条件为False时的跳转块

- 示例：

```
br i1 %cmp, label %if.then, label %if.else ;%cmp为True时，跳转到块%if.then，否则%if.else
```

**无条件跳转**

- 指令格式：

  ```
  br <label>
  ```

  - `br` : 指令类型
  - `<label>`: 跳转块

- 示例：

```
br label %if.end     ;跳转至块%if.end
```

### ASG中存储方式

存储在BrInstruction中，其中

- `exp`: 条件判断的语句
- `label_true`: 条件为True时的跳转块
- `label_false`: 条件为False时的跳转块

### ARM示例

无条件分支B指令：

- 指令格式：

  ```
  B <label>
  ```

  - `<label>`：目标标签（跳转位置）

- 功能说明：

  无条件跳转到指定标签处

- 示例：

  ```
  B loop_start    ; 跳转到 loop_start 标签
  ```

条件分支BEQ指令：

- 指令格式：

  ```
  BEQ <label>
  ```

  - `<label>`：目标标签（跳转位置）

- 功能说明：

  当上一次运算结果为相等（Zero 标志位 Z=1）时跳转到指定标签处

- 示例：

  ```
  BEQ end_loop
  ```

### Machine_IR存储方式

存储在MI_Branch，在Machine IR中，branch和条件判断是分开的，故在Machine_IR中只需要存储

- `cond`: 比较方式如equal、not_equal
- `true_target`: 条件为True时的跳转块
- `false_target`: 条件为False时的跳转块

### 提示

需要划分为有条件跳转与无条件跳转

- 对于无条件指令只需要创建跳转指令
- 对于无条件指令需要创建compare指令以及跳转指令

## Compare指令

compare指令通常为条件跳转服务，条件跳转会依据compare指令的返回值，决定跳转的基本块。

### IR示例

- 指令格式：

  ```
  icmp <type> <operand1>, <operand2>
  ```

  - `icmp` : 指令类型
  - `<type>` : 比较类型
  - `<operand1>` : 操作数1
  - `<operand2>` : 操作数2

- 示例

  ```
  %cmp = icmp eq i32 %call, 1    ;判断%call和1值是否相等，相等为True
  ```

### ASG存储方式

其存储在IcmpInstruction中

- `kind`: 比较的类型
- `a`: 比较数1
- `b`: 比较数2

### ARM示例

- 指令格式：

  ```
  CMP <Rn>, <Operand2>
  ```

  - `<Rn>`：第一个操作数（寄存器）
  - `<Operand2>`：第二个操作数（寄存器或立即数）

- 功能说明：

  比较两个操作数的差值，但不保存结果，仅更新条件标志位（如 Z, N, C, V），供条件跳转指令使用

- 示例：

  ```
  CMP R0, #10
  ```

### Machine_IR存储方式

存储在MI_Compare中，CMP指令与CMN指令共享同一个数据结构

- `lhs`: 对应操作数1
- `rhs`: 对应操作数2
- `neg`: 决定指令类型是否是CMN指令，False代表CMP指令

## Binary指令

Binary指令是指进行**两个操作数之间的算术或位运算操作**的指令。即加减乘除和位操作

### IR示例

- 指令格式

  ```
  <type> <Operand1>, <Operand2> 
  ```

  - `<type>`: 指令操作类型
  - `<Operand1>`: 操作数1
  - `<Operand2>`: 操作数2

- 示例：

```objectivec
%binary = add nsw i32 %reg, %binary
```

### ASG存储方式

存储在BinaryInstruction中

- `op`: 运算类型
- `a`: 操作数1
- `b`: 操作数2

### ARM示例

- 指令格式：

  ```
  ADD <Rd>, <Rn>, <Operand2>
  ```

  - `<Rd>`：目标寄存器（保存结果）
  - `<Rn>`：第一个操作数（寄存器）
  - `<Operand2>`：第二个操作数（寄存器或立即数）

- 功能说明：

  将两个操作数相加，并将结果写入目标寄存器，不影响源操作数

- 示例：

  ```
  ADD R0, R1, #5
  ```

### Machine_IR存储方式

存储在MI_Binary中，与IR极其相似，但是ARM中需要而外添加结果的保存位置

- `op`: 运算类型
- `lhs`: 操作数1
- `rhs`: 操作数2
- `dst`: 保存结果的地址

### 提示

- 对于mod指令，ARM没有对应的支持，需要利用加减乘除实现相同功能
- 对于一元非运算指令（bool类型取反），需要将其转换为1-x的形式（框架内没有实现MVN指令）
- 对于**乘法、除法**必须将操作数放入寄存器中，ARM不支持**立即数**作为操作数

## Return指令

return 指令（IR中的ret 指令）用于表示函数的返回操作，也就是将控制权从当前函数返回到调用它的地方，并可选择性地返回一个值。在ARM中函数的返回操作通过压入和弹出栈指针完成，而返回值存在r0寄存器中（int、float等基本类型）。

### IR示例

- 指令格式

  ```objectivec
  ret <value>
  ```

  - `ret`: 指令类型
  - `<value>`: 返回值

- 示例

```
ret i32 0
```

### ASG存储方式

存储在ReturnInstruction中，只需要保存返回值

- `retValue`: 返回值

### ARM示例

- 指令格式：

  ```
  BX <Rm>
  ```

  - `<Rm>`：包含跳转地址的寄存器

- 功能说明：

  跳转到 `<Rm>` 指定的地址，常用于从子程序返回

- 示例：

  ```
  BX LR
  ```

### Machine_IR存储方式

存储在MI_Return中，只需要存储指令的类型，无需存储返回值。因为返回值会被放入r0寄存器中。

### 提示

- 在存储返回指令前，需要将返回值存储到寄存器r0中。
- 本实验采用bx lr跳出循环，在后续的处理时，遇到MI_Return程序会自动转换（build_function_asm中处理）。这里需要存储MI_Return类型变量作为替换的信号。

## Call指令

call 指令用于**调用函数**。它可以调用 LLVM 中定义的函数，也可以调用外部声明的函数（如标准库函数）。调用时可以传递参数，并可以接收返回值

### IR示例

```
call i32 @func(i32 0)
```

由三部分组成

- `指令类型`: call
- `调用函数`: func
- `参数`: i32 0

### ASG存储方式

存储在CallInstruction中，其中

- `func`: 对应调用函数
- `argv`: 需传入的参数

### Arm示例

- 指令格式：

  ```
  BL <label>
  ```

  - `<label>`：目标标签（子程序入口地址）

- 功能说明：

  跳转到子程序，并将返回地址保存到 `LR`（链接寄存器）中，以便返回

- 示例：

  ```
  BL function_call
  ```

### Machine_IR存储方式

存储在MI_Func_Call中，在ARM中函数通过栈传入参数，所以需要存储被调用的参数个数，以及占栈空间的大小

- `func_name`: 被调用的函数名
- `arg_count`: 调用的参数个数
- `arg_stack_size`: 栈上参数所占空间大小
