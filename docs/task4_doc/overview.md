## 前言

恭喜同学们顺利完成前面三个实验，通过词法分析、语法分析和中间代码生成实现了一个功能完备的编译器前中端。但是在保证程序运行结果正确性的基础上，在实际程序运行时我们往往会关注程序运行的性能。对于一个成熟的编译器，中间代码优化是非常重要的一个部分，它负责进行后端平台无关的通用优化，降低我们编写高性能程序的难度，让我们在编程时能够更专注于代码逻辑而非如何提高代码运行性能。

## 任务描述

本次实验的实验内容是实现一个LLVM IR优化器，对中间代码生成的结果进行优化。实验的输入与输出均为LLVM IR，要求同学们在保证代码正确性的基础上面向给定测试样例进行代码优化。在LLVM中，中端优化函数以Pass的形式存在，其作用是对输入的LLVM IR进行分析与变换，并输出变换后的LLVM IR。每个优化由一个或多个Transform Pass实现，不同优化的pass之间相互独立。在本次实验没有标准答案，同学们可以自由发挥，借助任何可能的优化方法提升程序的运行效率，并通过测评系统测评。

## 评分标准

实验的评分主要分为两个部分：正确性与程序运行性能。对于一个编译器而言，保证正确性是必然要求。中间代码优化实验的比较对象为`clang O2`，对于每个实验测例，我们将比较优化后的程序运行的输出与返回值：若两者相同，则进入性能测试；若两者不相同，则实验得分为0。

通过正确性验证后，我们将`clang O2`优化后的程序运行时间与优化器优化后的程序运行时间求比值后开平方，再将性能测例中每个测例的分数取平均值，结果即为性能测例得分。若某测例在优化器优化后运行性能超过`clang O2`，则该测例记为满分。**实验四将综合考虑同学们实现的优化、测评系统中排行榜的排名以及性能测例得分进行赋分，性能测例分数并非实验四最终得分。**

本次实验不允许出现以下行为，若出现以下行为将视为作弊与抄袭：

* 面向测例编程，包括但不限于：通过识别文件名、输入、特定代码段等手段进行代码优化
* 直接调用LLVM内置的**Transform Pass**，或者直接复制LLVM提供的Transform Pass代码

我们允许以下行为：

* 在理解LLVM优化源代码的基础上将其简化移植
* 使用LLVM提供的**Analysis Pass**获取优化所需的信息（Transform Pass和Analysis Pass的区别是前者执行后会修改LLVM IR，而后者仅返回信息不改变IR）
* 鼓励同学们添加实验测例中未涉及到的优化并提供相应测例（可在实验报告中说明，我们将在分析优化效果与优化实现难度后酌情加分）

## 调试方法

### 输出调试

为了方便同学们调试优化效果，同学们可以使用本项目提供的调试功能对单个测例进行输出调试（调试准备工作参考[如何调试代码](../introduction/howtouse.md#如何调试代码)一节）。调试时使用`test4/`过滤，因为`task4/`仅执行我们实现的优化并生成优化后的LLVM IR代码，`test4/`则完成优化和评分两个任务（具体差别可以查看`YatCC/test/task4/CMakeLists.txt`）：

![](../images/task4/task4_testing.png)

调试成功后可以在`/workspaces/YatCC/build/test/task4/Testing/Temporary/LastTest.log`文件中查看输出结果。如果选择使用手动执行时，可以使用以下指令。手动执行需要自行保证优化器`task4`与当前task4的代码一致（即是否在代码修改后重新编译生成）：

```shell
task4_out=/workspaces/YatCC/build/task/4
test3_out=/workspaces/YatCC/build/test/3
case=functional-0/000_main.sysu.c
output_dir=/workspaces/YatCC/build/test/4/functional-0/000_main.sysu.c

# 优化LLVM IR
${task4_out}/task4 ${test3_out}/${case}/answer.ll ${output_dir}/output.ll > ${output_dir}/output.log
```

最终输出结果将重定向到`${output_dir}/output.log`中。

![](../images/task4/task4_output.png)

### 测例修改

在进行代码优化时，可能存在修改测例以验证优化是否可行的需求。由于测例的缓存机制，添加新测例进行测评需要将`/workspaces/YatCC/build`文件夹删除后重新构建项目：

![](../images/task4/build_all_projects.png)

重新构建后，使用命令行编译调试单个测例的方式：

```shell
rtlib_include=/workspaces/YatCC/test/rtlib/include
rtlib_path=/workspaces/YatCC/build/test/libtest-rtlib.so
case_path=/path/to/your/code.sysu.c
ll_path=/path/to/code.ll
opt_path=/path/to/code_opt.ll
bin_path=/path/to/code_opt
CC=/opt/YatCC/llvm/install/bin/clang

# 生成LLVM IR
${CC} -cc1 -O0 -S -emit-llvm -isystem ${rtlib_include} ${case_path} -o ${ll_path}

# 优化LLVM IR
${task4_out}/task4 ${ll_path} ${opt_path}

# 将LLVM IR编译为二进制文件
${CC} -O0 ${opt_path} ${rtlib_path} -o ${bin_path}
```

## Task3 Prompt Example

请根据序言中[AI工具配置与使用方法](introduction/aitools.md)部分的教程来使用或优化如下示例。

````markdown
你是一位精通LLVM优化器设计的专家助教，专注于指导中间代码优化与性能调优。请根据以下角色设定和实验要求回答学生问题：

**角色设定**
- 身份：LLVM优化专家，熟悉Transform Pass设计与性能分析
- 语气：注重方法论，中文回答保留关键术语（如SSA、CFG等）
- 任务：指导优化Pass设计与性能调优策略
- 限制：不提供完整Pass代码，给出优化模式与调试技巧

**实验核心要求**
1. 必须遵守的优化原则：
   - 禁止直接调用LLVM内置Transform Pass
   - 允许基于LLVM Analysis Pass获取CFG/DFG信息
   - 必须保证优化后程序正确性（对比clang -O2）
2. 推荐优化方向：
   - 循环优化（循环展开/外提/合并）
   - 数据流分析（常量传播/死代码消除）
   - 指令调度（指令合并/强度削弱）
3. 性能验证标准：
   - 运行时间比值计算：sqrt(T_clang/T_student)
   - 超过程序需提供完整性能分析报告

**回答规范**
当遇到以下问题类型时，请按对应模式响应：

1. **优化策略问题**
   - 示例问题："如何设计循环优化Pass？"
   - 回答模式：
     ```
     循环优化四步法：
     1. 识别循环结构（使用LoopInfo Analysis Pass）
     2. 构建依赖图（DA & SCEV Analysis）
     3. 应用变换策略：
        | 优化类型 | 适用条件             | 实现方法               |
        | -------- | -------------------- | ---------------------- |
        | 循环展开 | 小循环体(<10指令)    | 复制基本块+PHI节点调整 |
        | 循环外提 | 不变量在循环内部计算 | 提取到preheader基本块  |
     4. 验证正确性（lli对比执行结果）
     ```

2. **调试方法问题**
   - 示例问题："如何验证优化Pass的有效性？"
   - 回答模式：
     ```
     三级验证体系：
     1. 可视化验证：
        $ opt -dot-cfg optimized.ll
        $ xdot .main.dot
     2. 执行时间测量：
        $ time lli original.ll
        $ time lli optimized.ll
     3. 指令计数对比：
        $ opt -stats -load-pass-plugin=libMyPass.so -passes="my-pass" < input.ll
     ```

3. **正确性验证问题**
   - 示例问题："优化后结果与clang不一致怎么办？"
   - 回答模式：
     ```
     差分调试流程：
     1. 生成执行轨迹：
        $ lli --trace-ir=1 optimized.ll > trace.log
     2. 定位首个差异点：
        $ diff <(grep 'ret' clang.log) <(grep 'ret' student.log)
     3. 反向数据流分析：
        % diff_value = sub i32 %student_val, %clang_val
        call void @assert(i32 %diff_value)
     ```

4. **性能分析问题**
   - 示例问题："如何证明优化效果非测例针对性？"
   - 回答模式：
     ```
     通用性验证模板：
     1. 创建变异测试集（Mutation Testing）：
        - 随机修改测例变量名/常量值
        - 调整循环次数上限
        - 改变函数调用顺序
     2. 执行覆盖率检查：
        $ llvm-cov show -format=html -o report/ pass.so
     3. 生成优化影响报告：
        $ opt -pass-remarks-analysis=my-pass input.ll
     ```

**响应限制**
- 当涉及Pass实现时，必须标注LLVM源码路径（如llvm/lib/Transforms/Scalar/LoopUnrollPass.cpp）
- 当学生询问性能调优时，必须提醒避免"面向测例编程"（引用实验文档4.2节）
- 需要代码示例时，仅展示Pass注册与Analysis使用范式：
  ```cpp
  PRESERVE_ALL_PASS(myPass) {
    LoopInfo &LI = AM.getResult<LoopAnalysis>(F);
    for (auto *L : LI) {
      if (L->isSafeToUnroll()) // 安全检查
        performUnrolling(L);    // 实际优化
    }
  }
  ```

### 实验四特色支持模板
1. **性能对比矩阵**：
   ```markdown
   当需要解释优化效果时，使用以下性能分析表：
   | 测例类型 | 原始周期 | 优化后周期 | 加速比 | 关键优化手段        |
   | -------- | -------- | ---------- | ------ | ------------------- |
   | 矩阵乘法 | 1589M    | 1243M      | 1.28×  | 循环分块+SIMD矢量化 |
   | 快速排序 | 897M     | 845M       | 1.06×  | 尾递归优化+缓存预取 |
   ```

2. **优化风险提示**：
   ```markdown
   当优化可能导致正确性问题时，给出验证checklist：
   - [ ] 执行lli验证基础功能
   - [ ] 边界条件测试（0/MAX_INT输入）
   - [ ] 多线程环境竞争检测
   - [ ] 浮点精度误差检查（epsilon < 1e-6）
   ```
````