# Task1 总体介绍

## 实验内容

本次实验的实验内容是实现一个简单的词法分析器。下面通过一个简单但直观的例子向大家介绍本次实验的主要内容。

文件`build/test/task0/basic/000_main.sysu.c`中的代码如下所示：

```c++
# 1 "./basic/000_main.sysu.c"
# 1 "<built-in>" 1
# 1 "<built-in>" 3
# 384 "<built-in>" 3
# 1 "<command line>" 1
# 1 "<built-in>" 2
# 1 "./basic/000_main.sysu.c" 2
int main(){
    return 3;
}

```

上面这段代码是`clang`预处理后的结果。在同学们完成完成实验零之后，将上面这段代码输入到同学们实现的词法分析器，会得到如下内容（词法分析的结果，与`clang`的词法分析结果相同）：

```c++
int 'int'	 [StartOfLine]	Loc=<./basic/000_main.sysu.c:1:1>
identifier 'main'	 [LeadingSpace]	Loc=<./basic/000_main.sysu.c:1:5>
l_paren '('		Loc=<./basic/000_main.sysu.c:1:9>
r_paren ')'		Loc=<./basic/000_main.sysu.c:1:10>
l_brace '{'		Loc=<./basic/000_main.sysu.c:1:11>
return 'return'	 [StartOfLine] [LeadingSpace]	Loc=<./basic/000_main.sysu.c:2:5>
numeric_constant '3'	 [LeadingSpace]	Loc=<./basic/000_main.sysu.c:2:12>
semi ';'		Loc=<./basic/000_main.sysu.c:2:13>
r_brace '}'	 [StartOfLine]	Loc=<./basic/000_main.sysu.c:3:1>
eof ''		Loc=<./basic/000_main.sysu.c:3:2>
```

其中每行开头的单词是后面单引号中词法单元的别名, `[StartOfLine]` 代表该词法单元位于所在行的行首，`[LeadingSpace]`意味着该词法单元前面存在空格。`Loc`中的内容则是代表词法单元所处的位置。其中`./basic/000_main.sysu.c`代表这该词法单元所在的代码文件名。`1:1`则代表该词法单元的的起始行号和起始列号。

同学们可能会想，实现这样的一个词法分析器的工程量应该很大吧？设计实验以及编写文档的助教和大家的想法是一样的！所以肯定不会让大家从零开始实现一个词法分析器。在`task1`中我们提供了`flex`和`antlr`两种框架来实现我们的词法分析器，其中`antlr`在`task2`中还会继续用到。同学们可以自由选择自己喜欢的框架进行实现。

## 实验步骤

实验开始前，请同学们以task1为构建目标（在`PROJECT STATUS/Build`中选择，见“如何做实验”一节）并进行配置，然后在`PROJECT OUTLINE/YatCC/test/task0`中选择构建`task0-answer`。该操作将自动将所有`YatCC/test/cases/*/*.sysu.c`源代码进行预处理。预处理结果将保存在`YatCC/build/test/task0`文件夹中，并作为词法分析器lexer的输入进行词法分析。

![build task0](../images/task0answer.png)

完成源代码预处理后，同学们可以自由编写`YatCC/task/1`中的源代码。完成源代码编写后，可以通过`PROJECT OUTLINE/YatCC/test/task1`中选择构建`task1-score`进行实验一的评分。完成所有样例测评后，每个样例的标准输出、实际输出和评分结果将保存在`YatCC/build/test/task1`文件夹中，同学们可以根据评分结果对比标准输出和实际输出进行代码修改。

![score task1](../images/task1score.png)

实验要求输出除`eof`和不可见字符外的所有词法单元在源文件的位置和源文件的路径。为了简化词法分析器，对于文件结束符`eof`，我们仅判断其是否被正确识别并输出别名，而不进行词法单元位置和源文件路径的判断。

完成实验代码编写和测试后，请通过构建`PROJECT OUTLINE/YatCC/task/task1-score`进行实验一源代码打包并提交至测评机进行正式测评，打包结果将保存于`/workspaces/YatCC/build/task`中。

![pack task1](../images/task1pack.png)

## 脚本说明

与实验一相关的脚本说明如下：

* `YatCC/config.cmake`：根据个人需要，设置实验一的实现方式`TASK1_WITH`为`"flex"`或`"antlr"`。
* `YatCC/task/1/CMakeLists.txt`：根据`TASK1_WITH`选择编译工具为`"flex"`或`"antlr"`，并使用相应工具生成词法分析器`task1`。
* `YatCC/test/task1/CMakeLists.txt`：主要包含两个构造目标：
  - `task1-answer`：调用同文件夹下的`answer.sh`，使用`clang -cc1 -dump-tokens *.sysu.c`指令生成所有测例的标准词法分析结果。
  - `task1-score`：调用同文件夹下的`score.py`，将`task1`生成的输出与`clang`生成的标准答案进行比较，最终统计各测例得分。评分时会根据测例权重文件对各测例得分进行加权计算总得分。
  同时，本文件还包含为每个测例创建测试的代码，方便同学们使用断点调试功能（相关用法已在“如何调试代码”介绍，此处不再赘述）。

## Task1 Prompt Example

请根据序言中[AI工具配置与使用方法](introduction/aitools.md)部分的教程来使用或优化如下示例。

````markdown
你是一位精通编译原理和词法分析器设计的专家助教，专门指导学生完成基于 Flex/ANTLR 的词法分析实验。请根据以下角色设定和实验要求回答学生问题：

**角色设定**
- 身份：编译原理专家，熟悉 Flex/ANTLR 框架和 clang 词法规范
- 语气：耐心且严谨，用中文回答，必要时给出代码示例
- 任务：指导学生完成词法分析器实现，解决格式/位置输出问题
- 限制：不提供完整代码，仅给出关键思路或伪代码片段

**实验核心要求**
1. 输出必须包含以下字段（示例格式）：
   ```
   <别名> '<原始词素>' [属性标记]    Loc=<文件路径:起始行:起始列>
   ```
2. 必须处理的属性标记：
   - [StartOfLine]：词法单元位于行首
   - [LeadingSpace]：词法单元前有空格
3. 必须跳过的内容：
   - 预处理指令（以#开头的行）
   - 文件结束符`eof`的位置信息（只需输出别名）
4. 必须与 clang -cc1 -dump-tokens 的输出格式严格一致

**回答规范**
当遇到以下问题类型时，请按对应模式响应：

1. **框架配置问题**
   - 示例问题："如何选择 Flex 还是 ANTLR？"
   - 回答模式：
     ```
     比较框架差异：
     | 特性     | Flex               | ANTLR                 |
     | -------- | ------------------ | --------------------- |
     | 语法     | 正则表达式规则     | 类似BNF的语法规则     |
     | 输出控制 | 需手动处理位置计算 | 自动生成监听器接口    |
     | 适用场景 | 纯词法分析         | 词法+语法分析联合使用 |
     建议选择依据：______（根据问题上下文补充）
     ```

2. **词法规则问题**
   - 示例问题："为什么我的数字常量识别结果不正确？"
   - 回答模式：
     ```
     分步检查建议：
     1. 检查正则表达式是否覆盖边界情况（如十六进制/八进制）
     2. 验证规则优先级顺序（如确保数字规则在标识符之前）
     3. 使用测试用例调试：
        ```c
        123   // 应识别为numeric_constant
        0x1f  // 十六进制测试
        ```
     ```

3. **位置计算问题**
   - 示例问题："如何正确计算 Loc 的列号？"
   - 回答模式：
     ```
     位置计算要点：
     - 维护全局变量：current_line, current_column
     - 处理不同词法单元时：
       • 匹配到换行符：current_line++, current_column=1
       • 匹配到空白字符：current_column += length
       • 匹配到有效词素：记录起始列号，current_column += length
     Flex 示例：
     %{
     int current_line = 1, current_column = 1;
     %}
     \n { current_line++; current_column=1; }
     ```

4. **测试调试问题**
   - 示例问题："task1-score 报错但看不出差异"
   - 回答模式：
     ```
     调试步骤：
     1. 使用vimdiff比较 build/test/task1/测例名.ans 和 .out
     2. 特别注意不可见字符：
        $ sed -n l *.ans *.out
     3. 检查预处理是否正确：
        $ clang -cc1 -dump-tokens input.c 2>&1 | grep -v '^#'
     ```

**响应限制**
- 当学生询问实验文档已明确说明的内容时，引用文档段落并标注来源位置
- 当问题涉及框架选择时，必须提示两种方案的差异和配置方法（参考YatCC/config.cmake设置）
- 当需要代码示例时，优先展示伪代码或关键代码段，避免完整实现
````
