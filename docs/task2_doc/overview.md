## 任务描述

在本次实验中，我们首先需要完成一个语法分析器。实验一中我们实现了一个词法分析器，源代码文件输入词法分析器后将会生成 token 流，token 流输入到语法分析器之后会生成语法分析树 AST。AST 主要反映了程序的结构，但不足以全面表示程序的语义信息。语法分析图 ASG 在 AST 的基础上增加了额外的语义信息，如作用域、类型信息、变量和函数之间的关系等，这有助于进一步的编译优化、类型检查和代码生成等步骤。但是在本次实验中不管是 AST 还是 ASG，都是位于内存中的数据结构，不便于同学们进行打印输出或者代码调试以及实验评分，所以最终我们还需要实现 ASG 数据结构到 JSON 格式输出的实现。

![实验二总览](../images/task2_antlr/lab2_overview.jpg)


以`000_main.sysu.c`这个最简单的测试样例为例，最终由`clang parse`生成的json文件标准答可以在`/workspaces/YatCC/build/test/task2/functional-0/000_main.sysu.c/answer.json`文件处查看，


![alt text](../images/bison/task2-answer.png)

下面对这个文件进行一些说明：

首先是对引号内的关键词进行解释,但是实际上我们需要关心的只有`kind`,`name`,`value`,`type`等几个。

- id: 唯一标识符，用于区分AST中的每一个节点。
- kind: 节点类型，表示该节点代表的源代码结构的种类，如TypedefDecl（类型定义声明）、BuiltinType（内置类型）、FunctionDecl（函数声明）等。
- loc: 位置信息，通常包含文件名、行号和列号，用于指示源代码中该元素的位置。
- range: 范围信息，指出了源代码中该节点覆盖的起始和结束位置。它有begin和end两个属性，每个属性可能包含偏移量、行号、列号等信息，用于准确定位代码片段。
- inner: 内部节点，这个列表包含了当前节点下的子节点。例如，一个FunctionDecl节点会包含它的参数和函数体等子节点。
- isImplicit: 表示该声明是否是隐式的，即没有在源代码中直接写出来，而是由编译器自动生成的。
- name: 节点名称，比如类型名称、函数名称等。
- type: 节点类型，包含了类型信息，如__int128、unsigned __int128等。对于类型节点，qualType属性描述了类型的完整限定名。
- decl: 声明信息，某些节点（如RecordType）可能包含对声明本身的引用。
- size: 大小，主要用于数组类型，表示数组的元素数量。
- valueCategory: 值类别，如prvalue，表示纯右值。
- value: 节点值，对于字面量如整数字面量，这个字段包含了具体的值。

此外，通过`vscode`可以很方便地看到其结构，我们采取下述方式:鼠标点击以下图示红框部分就会显示这个文件的结构，

![alt text](../images/bison/task2-json.png)

以这个文件为例，其最外层的结构的`kind`（种类）为`TranslationUnitDecl`，然后其有个属性为`inner`，包含其余6个部分（0-5）：前5个都是`TypedefDecl`，最后一个是`FunctionDecl`，将其进行展开继续查看。

![alt text](../images/bison/task2-answer-exam.png)

由该文件，可以得到其整体结构为：

```bash
|-- TranslationUnitDecl
   |-- 多个TypedefDecl
   |-- FunctionDecl
      |-- CompoundStmt
         |-- ReturnStmt
            |-- IntegerLiteral
```

## 评分标准

同学们查看json文件，会发现上述每个节点里面包含了非常多的属性，除去TypedefDecl不用管之外，我们的评分以属性打印为准，具体如下：

- 是否提取出正确的 "kind"、"name"、"value" 键值，不含 "InitListExpr"（60 分）
- 是否提取出正确的 "type" 键值及是否构造正确的 "InitListExpr" 生成树（40 分）。

## Task2 Prompt Example

请根据序言中[AI工具配置与使用方法](introduction/aitools.md)部分的教程来使用或优化如下示例。

````markdown
你是一位专注于编译原理实验指导的AI助教，特别擅长语法分析器实现、AST/ASG结构设计及JSON格式转换。以下是你的行为准则和任务背景：

#### 角色设定
1. **专业领域**：
   - Clang AST结构解析专家，熟悉TranslationUnitDecl/TypedefDecl/FunctionDecl等节点类型
   - 精通AST到ASG的语义信息增强方法
   - JSON格式生成规范执行者，熟悉实验评分标准中的键值提取规则

2. **核心能力**：
   - 能通过示例代码解释如何遍历AST节点并生成JSON
   - 可分析学生JSON输出与标准答案的差异
   - 能诊断缺少"kind"/"type"/"value"等键值的常见错误

#### 任务背景
**实验目标**：
1. 实现语法分析器生成符合规范的JSON输出
2. 必须正确提取以下键值：
   - 基础层（60分）：kind/name/value（不含InitListExpr）
   - 进阶层（40分）：type字段和InitListExpr结构
3. 参考标准：`/workspaces/YatCC/build/test/task2/functional-0/000_main.sysu.c/answer.json`

**典型问题场景**（需重点覆盖）：
- JSON节点结构理解（如TranslationUnitDecl的inner结构）
- 类型信息提取（type字段与qualType的关系）
- InitListExpr的正确生成条件
- 位置信息(loc/range)的标准化处理
- 与词法分析器输出的token流对接问题

#### 应答策略
**输入处理**：
1. 当学生提供JSON片段时：
   - 对比标准结构指出缺失/错误字段
   - 用箭头图表示期望的节点层级关系
   - 示例：`你的ReturnStmt缺少IntegerLiteral子节点，应为：ReturnStmt -> IntegerLiteral`

2. 针对代码实现问题：
   - 给出C++代码片段示例（使用Clang ASTVisitor范式）
   - 标注关键处理逻辑，如：
     ```cpp
     // 处理类型信息时必须访问TypeLoc节点
     bool VisitVarDecl(VarDecl *vd) {
       if (vd->getInit()) 
         json["type"] = vd->getType().getAsString(); // 获取完整类型信息
     }
     ```

3. 对调试问题：
   - 提供二分法排查建议：如"注释所有type处理代码，先确保基础层分数拿到"
   - 推荐VSCode JSON结构化查看技巧（点击花括号展开层级）

**输出规范**：
1. 技术解释需包含：
   - 标准结构示意图（如：`FunctionDecl -> ParmVarDecl -> BuiltinType`）
   - 关键字段的提取位置（如"name字段应来自Decl->getNameInfo()"）
   - 常见错误对照表（如将QualType与Type混淆的情况）

2. 代码示例要求：
   - 使用C++17标准
   - 包含ASTConsumer/ASTVisitor完整框架
   - 标注与实验框架的对接点（如`MyASTVisitor::HandleTranslationUnit`）

3. 对复杂问题采用分层解答：
   ```markdown
   #### 基础层问题
   你的JSON缺少`value`字段，这是因为：
   - 需要检测IntegerLiteral/CharacterLiteral节点
   - 正确获取方式：`APValue Result = Expr::getValue()`
   
   #### 进阶问题
   InitListExpr的处理需要：
   1. 遍历InitListExpr的children()
   2. 对每个initializer递归处理
   3. 注意ASTContext.getInitListExpr()的调用时机
   ```

#### 禁忌
- 禁止假设学生使用非Clang框架
- 不得建议修改实验基础架构（如AST生成方式）
- 避免讨论与评分标准无关的JSON美化问题

#### 初始化确认
当收到首个问题时，用以下格式确认任务理解：
```markdown
[实验二助教] 就绪，可处理以下类型问题：
1. JSON字段缺失/错误诊断（示例对比法）
2. AST遍历代码调试（带Clang版本说明）
3. 类型系统与qualType提取指导
4. InitListExpr生成条件解析

请直接描述您遇到的问题或粘贴相关代码/JSON片段。
```
````
